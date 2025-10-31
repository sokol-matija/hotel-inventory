

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE SCHEMA IF NOT EXISTS "public";


ALTER SCHEMA "public" OWNER TO "pg_database_owner";


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE OR REPLACE FUNCTION "public"."audit_trigger_function"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        INSERT INTO audit_logs (
            user_id,
            action,
            table_name,
            record_id,
            old_values,
            new_values,
            description
        ) VALUES (
            auth.uid(),
            'DELETE',
            TG_TABLE_NAME,
            OLD.id,
            row_to_json(OLD),
            NULL,
            'Record deleted'
        );
        RETURN OLD;
    ELSIF TG_OP = 'UPDATE' THEN
        INSERT INTO audit_logs (
            user_id,
            action,
            table_name,
            record_id,
            old_values,
            new_values,
            description
        ) VALUES (
            auth.uid(),
            'UPDATE',
            TG_TABLE_NAME,
            NEW.id,
            row_to_json(OLD),
            row_to_json(NEW),
            'Record updated'
        );
        RETURN NEW;
    ELSIF TG_OP = 'INSERT' THEN
        INSERT INTO audit_logs (
            user_id,
            action,
            table_name,
            record_id,
            old_values,
            new_values,
            description
        ) VALUES (
            auth.uid(),
            'CREATE',
            TG_TABLE_NAME,
            NEW.id,
            NULL,
            row_to_json(NEW),
            'Record created'
        );
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$;


ALTER FUNCTION "public"."audit_trigger_function"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."auto_normalize_reservation"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $_$
DECLARE
    guest_ids text[];
    current_guest_id text;
BEGIN
    -- Only process if this reservation doesn't already have normalized data
    IF NOT EXISTS (SELECT 1 FROM reservation_guests WHERE reservation_id = NEW.id) THEN
        -- Add primary guest
        INSERT INTO reservation_guests (reservation_id, guest_id)
        VALUES (NEW.id, NEW.guest_id)
        ON CONFLICT DO NOTHING;
        
        -- Create primary guest stay
        INSERT INTO guest_stays (reservation_id, guest_id, check_in, check_out)
        VALUES (
            NEW.id, 
            NEW.guest_id,
            NEW.check_in_date::timestamptz,
            NEW.check_out_date::timestamptz
        )
        ON CONFLICT DO NOTHING;
        
        -- Parse additional adults from notes/special_requests
        IF NEW.internal_notes IS NOT NULL AND NEW.internal_notes LIKE '%additional_adults:%' THEN
            guest_ids := string_to_array(
                substring(NEW.internal_notes FROM 'additional_adults:([^|]+)'), 
                ','
            );
            
            FOREACH current_guest_id IN ARRAY guest_ids
            LOOP
                current_guest_id := trim(current_guest_id);
                IF current_guest_id != '' AND current_guest_id ~ '^[0-9]+$' THEN
                    -- Add to reservation_guests
                    INSERT INTO reservation_guests (reservation_id, guest_id)
                    VALUES (NEW.id, current_guest_id::integer)
                    ON CONFLICT DO NOTHING;
                    
                    -- Create guest stay
                    INSERT INTO guest_stays (reservation_id, guest_id, check_in, check_out)
                    VALUES (
                        NEW.id, 
                        current_guest_id::integer,
                        NEW.check_in_date::timestamptz,
                        NEW.check_out_date::timestamptz
                    )
                    ON CONFLICT DO NOTHING;
                END IF;
            END LOOP;
        END IF;
        
        -- Also check special_requests field
        IF NEW.special_requests IS NOT NULL AND NEW.special_requests LIKE '%additional_adults:%' THEN
            guest_ids := string_to_array(
                substring(NEW.special_requests FROM 'additional_adults:([^|]+)'), 
                ','
            );
            
            FOREACH current_guest_id IN ARRAY guest_ids
            LOOP
                current_guest_id := trim(current_guest_id);
                IF current_guest_id != '' AND current_guest_id ~ '^[0-9]+$' THEN
                    -- Add to reservation_guests
                    INSERT INTO reservation_guests (reservation_id, guest_id)
                    VALUES (NEW.id, current_guest_id::integer)
                    ON CONFLICT DO NOTHING;
                    
                    -- Create guest stay
                    INSERT INTO guest_stays (reservation_id, guest_id, check_in, check_out)
                    VALUES (
                        NEW.id, 
                        current_guest_id::integer,
                        NEW.check_in_date::timestamptz,
                        NEW.check_out_date::timestamptz
                    )
                    ON CONFLICT DO NOTHING;
                END IF;
            END LOOP;
        END IF;
    END IF;
    
    -- Auto-populate enumeration foreign keys
    UPDATE reservations 
    SET 
        status_id = rs.id,
        booking_source_id = bs.id
    FROM reservation_statuses rs, booking_sources bs
    WHERE reservations.id = NEW.id
    AND rs.code = COALESCE(NEW.status, 'confirmed')
    AND (bs.code = NEW.booking_source OR 
         (NEW.booking_source = 'booking.com' AND bs.code = 'booking_com'))
    AND (reservations.status_id IS NULL OR reservations.booking_source_id IS NULL);
    
    RETURN NEW;
END;
$_$;


ALTER FUNCTION "public"."auto_normalize_reservation"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."auto_update_reservation_enums"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    -- Update foreign keys when text fields change
    IF OLD.status IS DISTINCT FROM NEW.status THEN
        UPDATE reservations 
        SET status_id = rs.id
        FROM reservation_statuses rs
        WHERE reservations.id = NEW.id
        AND rs.code = NEW.status;
    END IF;
    
    IF OLD.booking_source IS DISTINCT FROM NEW.booking_source THEN
        UPDATE reservations 
        SET booking_source_id = bs.id
        FROM booking_sources bs
        WHERE reservations.id = NEW.id
        AND (bs.code = NEW.booking_source OR 
             (NEW.booking_source = 'booking.com' AND bs.code = 'booking_com'));
    END IF;
    
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."auto_update_reservation_enums"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."calculate_child_age"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.current_age := EXTRACT(YEAR FROM AGE(NEW.date_of_birth));
    NEW.discount_category := CASE
        WHEN NEW.current_age < 3 THEN '0-3'
        WHEN NEW.current_age < 7 THEN '3-7'
        WHEN NEW.current_age < 14 THEN '7-14'
        ELSE 'adult'
    END;
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."calculate_child_age"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."calculate_line_item_totals"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.line_subtotal := NEW.quantity * NEW.unit_price;
    NEW.vat_amount := NEW.line_subtotal * NEW.vat_rate;
    NEW.line_total := NEW.line_subtotal + NEW.vat_amount;
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."calculate_line_item_totals"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."calculate_payment_amounts"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.amount_in_base_currency := NEW.amount * NEW.exchange_rate;
    NEW.net_amount := NEW.amount - NEW.merchant_fee;
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."calculate_payment_amounts"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."check_tables_exist"("table_names" "text"[]) RETURNS TABLE("table_name" "text")
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    RETURN QUERY
    SELECT t.table_name::text
    FROM information_schema.tables t
    WHERE t.table_schema = 'public' 
    AND t.table_name = ANY(table_names);
END;
$$;


ALTER FUNCTION "public"."check_tables_exist"("table_names" "text"[]) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_room_price"("p_room_id" integer, "p_date" "date" DEFAULT CURRENT_DATE) RETURNS TABLE("room_id" integer, "season_code" character varying, "season_name" character varying, "base_rate" numeric, "currency" character varying)
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    RETURN QUERY
    SELECT 
        rp.room_id,
        ps.code,
        ps.name,
        rp.base_rate,
        rp.currency
    FROM room_pricing rp
    JOIN pricing_seasons ps ON rp.season_id = ps.id
    WHERE rp.room_id = p_room_id
    AND ps.is_active = true
    AND p_date BETWEEN ps.start_date AND ps.end_date
    AND rp.valid_from <= p_date
    AND (rp.valid_to IS NULL OR rp.valid_to >= p_date)
    ORDER BY ps.priority DESC, rp.valid_from DESC
    LIMIT 1;
END;
$$;


ALTER FUNCTION "public"."get_room_price"("p_room_id" integer, "p_date" "date") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."log_audit_entry"("p_user_id" "uuid", "p_action" "text", "p_table_name" "text", "p_record_id" integer, "p_description" "text", "p_old_values" "jsonb" DEFAULT NULL::"jsonb", "p_new_values" "jsonb" DEFAULT NULL::"jsonb") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    INSERT INTO public.audit_logs (
        user_id,
        action,
        table_name,
        record_id,
        old_values,
        new_values,
        description,
        created_at
    ) VALUES (
        p_user_id,
        p_action,
        p_table_name,
        p_record_id,
        p_old_values,
        p_new_values,
        p_description,
        now()
    );
END;
$$;


ALTER FUNCTION "public"."log_audit_entry"("p_user_id" "uuid", "p_action" "text", "p_table_name" "text", "p_record_id" integer, "p_description" "text", "p_old_values" "jsonb", "p_new_values" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."log_inventory_quantity_update"("p_inventory_id" integer, "p_item_name" "text", "p_old_quantity" integer, "p_new_quantity" integer, "p_location_name" "text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
    INSERT INTO audit_logs (
        user_id,
        action,
        table_name,
        record_id,
        old_values,
        new_values,
        description
    ) VALUES (
        auth.uid(),
        'QUANTITY_UPDATE',
        'inventory',
        p_inventory_id,
        json_build_object('quantity', p_old_quantity),
        json_build_object('quantity', p_new_quantity),
        format('Quantity updated for %s in %s: %s → %s', 
               p_item_name, p_location_name, p_old_quantity, p_new_quantity)
    );
END;
$$;


ALTER FUNCTION "public"."log_inventory_quantity_update"("p_inventory_id" integer, "p_item_name" "text", "p_old_quantity" integer, "p_new_quantity" integer, "p_location_name" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."migrate_all_reservations_to_daily_details"() RETURNS TABLE("reservation_id" integer, "rows_inserted" integer, "status" "text")
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    v_reservation RECORD;
    v_rows_inserted INTEGER;
    v_total_reservations INTEGER := 0;
    v_successful_migrations INTEGER := 0;
BEGIN
    -- Count total reservations
    SELECT COUNT(*) INTO v_total_reservations FROM reservations;
    
    -- Loop through all reservations that haven't been migrated yet
    FOR v_reservation IN 
        SELECT r.id as res_id FROM reservations r
        WHERE r.id NOT IN (SELECT DISTINCT rdd.reservation_id FROM reservation_daily_details rdd)
        ORDER BY r.id
    LOOP
        BEGIN
            v_rows_inserted := migrate_reservation_to_daily_details(v_reservation.res_id);
            v_successful_migrations := v_successful_migrations + 1;
            
            RETURN QUERY SELECT v_reservation.res_id, v_rows_inserted, 'SUCCESS'::TEXT;
            
        EXCEPTION WHEN OTHERS THEN
            -- Log the error and continue
            RETURN QUERY SELECT v_reservation.res_id, 0, SQLERRM::TEXT;
        END;
    END LOOP;
    
    -- Return summary
    RETURN QUERY SELECT 
        -1 as res_id, 
        v_successful_migrations as rows_ins, 
        ('SUMMARY: ' || v_successful_migrations || '/' || v_total_reservations || ' reservations migrated')::TEXT as stat;
        
END;
$$;


ALTER FUNCTION "public"."migrate_all_reservations_to_daily_details"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."migrate_enumeration_data"() RETURNS TABLE("reservations_migrated" integer, "rooms_migrated" integer, "unmapped_statuses" "text"[], "unmapped_sources" "text"[], "unmapped_room_types" "text"[])
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    res_count INTEGER := 0;
    room_count INTEGER := 0;
    unmapped_status TEXT[];
    unmapped_source TEXT[];
    unmapped_type TEXT[];
BEGIN
    -- Migrate reservation statuses
    UPDATE reservations 
    SET status_id = rs.id 
    FROM reservation_statuses rs 
    WHERE reservations.status = rs.code 
    AND reservations.status_id IS NULL;
    
    GET DIAGNOSTICS res_count = ROW_COUNT;
    
    -- Migrate booking sources  
    UPDATE reservations 
    SET booking_source_id = bs.id 
    FROM booking_sources bs 
    WHERE (reservations.booking_source = bs.code OR 
           (reservations.booking_source = 'booking.com' AND bs.code = 'booking_com'))
    AND reservations.booking_source_id IS NULL;
    
    -- Migrate room types
    UPDATE rooms 
    SET room_type_id = rt.id 
    FROM room_types rt 
    WHERE rooms.room_type = rt.code 
    AND rooms.room_type_id IS NULL;
    
    GET DIAGNOSTICS room_count = ROW_COUNT;
    
    -- Find unmapped values
    SELECT ARRAY_AGG(DISTINCT status) INTO unmapped_status
    FROM reservations 
    WHERE status IS NOT NULL 
    AND status_id IS NULL;
    
    SELECT ARRAY_AGG(DISTINCT booking_source) INTO unmapped_source
    FROM reservations 
    WHERE booking_source IS NOT NULL 
    AND booking_source_id IS NULL;
    
    SELECT ARRAY_AGG(DISTINCT room_type) INTO unmapped_type
    FROM rooms 
    WHERE room_type IS NOT NULL 
    AND room_type_id IS NULL;
    
    RETURN QUERY SELECT res_count, room_count, 
        COALESCE(unmapped_status, ARRAY[]::TEXT[]),
        COALESCE(unmapped_source, ARRAY[]::TEXT[]),
        COALESCE(unmapped_type, ARRAY[]::TEXT[]);
END;
$$;


ALTER FUNCTION "public"."migrate_enumeration_data"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."migrate_reservation_guests"() RETURNS integer
    LANGUAGE "plpgsql"
    AS $_$
DECLARE
    reservation_record RECORD;
    guest_ids text[];
    current_guest_id text;
    migrated_count integer := 0;
BEGIN
    -- Migrate existing reservations
    FOR reservation_record IN 
        SELECT r.id, r.guest_id, r.special_requests, r.internal_notes, r.adults, r.children_count, r.check_in_date, r.check_out_date
        FROM reservations r
        WHERE r.id NOT IN (SELECT DISTINCT rg.reservation_id FROM reservation_guests rg)
    LOOP
        -- Add primary guest
        INSERT INTO reservation_guests (reservation_id, guest_id)
        VALUES (reservation_record.id, reservation_record.guest_id)
        ON CONFLICT DO NOTHING;
        
        -- Create guest stay for primary guest
        INSERT INTO guest_stays (reservation_id, guest_id, check_in, check_out)
        VALUES (
            reservation_record.id, 
            reservation_record.guest_id,
            reservation_record.check_in_date::timestamptz,
            reservation_record.check_out_date::timestamptz
        )
        ON CONFLICT DO NOTHING;
        
        -- Parse additional guests from special_requests
        IF reservation_record.special_requests IS NOT NULL AND reservation_record.special_requests LIKE '%additional_adults:%' THEN
            guest_ids := string_to_array(
                substring(reservation_record.special_requests FROM 'additional_adults:([^|]+)'), 
                ','
            );
            
            FOREACH current_guest_id IN ARRAY guest_ids
            LOOP
                current_guest_id := trim(current_guest_id);
                IF current_guest_id != '' AND current_guest_id ~ '^[0-9]+$' THEN
                    -- Add to reservation_guests
                    INSERT INTO reservation_guests (reservation_id, guest_id)
                    VALUES (reservation_record.id, current_guest_id::integer)
                    ON CONFLICT DO NOTHING;
                    
                    -- Create guest stay
                    INSERT INTO guest_stays (reservation_id, guest_id, check_in, check_out)
                    VALUES (
                        reservation_record.id, 
                        current_guest_id::integer,
                        reservation_record.check_in_date::timestamptz,
                        reservation_record.check_out_date::timestamptz
                    )
                    ON CONFLICT DO NOTHING;
                END IF;
            END LOOP;
        END IF;
        
        migrated_count := migrated_count + 1;
    END LOOP;
    
    RETURN migrated_count;
END;
$_$;


ALTER FUNCTION "public"."migrate_reservation_guests"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."migrate_reservation_to_daily_details"("p_reservation_id" integer) RETURNS integer
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    v_reservation RECORD;
    v_current_date DATE;
    v_children_ids INTEGER[];
    v_rows_inserted INTEGER := 0;
BEGIN
    -- Get reservation details
    SELECT 
        id, check_in_date, check_out_date, adults, 
        has_pets, parking_required
    INTO v_reservation
    FROM reservations 
    WHERE id = p_reservation_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Reservation % not found', p_reservation_id;
    END IF;
    
    -- Get children IDs for this reservation
    SELECT ARRAY_AGG(id) INTO v_children_ids
    FROM guest_children 
    WHERE reservation_id = p_reservation_id;
    
    -- If no children, set empty array
    IF v_children_ids IS NULL THEN
        v_children_ids := ARRAY[]::INTEGER[];
    END IF;
    
    -- Create daily details for each night
    v_current_date := v_reservation.check_in_date;
    
    WHILE v_current_date < v_reservation.check_out_date LOOP
        INSERT INTO reservation_daily_details (
            reservation_id,
            stay_date,
            adults_present,
            children_present,
            parking_spots_needed,
            pets_present,
            towel_rentals
        ) VALUES (
            p_reservation_id,
            v_current_date,
            v_reservation.adults,
            v_children_ids,
            CASE WHEN v_reservation.parking_required THEN 1 ELSE 0 END,
            COALESCE(v_reservation.has_pets, false),
            0
        );
        
        v_rows_inserted := v_rows_inserted + 1;
        v_current_date := v_current_date + INTERVAL '1 day';
    END LOOP;
    
    RETURN v_rows_inserted;
END;
$$;


ALTER FUNCTION "public"."migrate_reservation_to_daily_details"("p_reservation_id" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."reset_daily_room_cleaning"() RETURNS TABLE("rooms_reset" integer, "execution_time" timestamp with time zone)
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  affected_count INTEGER;
BEGIN
  -- Update rooms that were occupied yesterday (regardless of current is_cleaned status)
  WITH occupied_rooms AS (
    SELECT DISTINCT r.room_id
    FROM reservations r
    WHERE r.check_in_date <= (CURRENT_DATE - INTERVAL '1 day')
      AND r.check_out_date >= (CURRENT_DATE - INTERVAL '1 day')
      AND r.status NOT IN ('cancelled', 'no-show')
  )
  UPDATE rooms
  SET 
    is_cleaned = false,
    updated_at = NOW()
  FROM occupied_rooms
  WHERE rooms.id = occupied_rooms.room_id;
  
  GET DIAGNOSTICS affected_count = ROW_COUNT;
  
  RETURN QUERY SELECT affected_count, NOW();
END;
$$;


ALTER FUNCTION "public"."reset_daily_room_cleaning"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."reset_daily_room_cleaning"("trigger_source" "text" DEFAULT 'automatic'::"text") RETURNS TABLE("rooms_reset" integer, "execution_time" timestamp with time zone)
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  affected_count INTEGER;
  exec_time TIMESTAMPTZ;
BEGIN
  exec_time := NOW();
  
  -- Update rooms that were occupied yesterday (regardless of current is_clean status)
  WITH occupied_rooms AS (
    SELECT DISTINCT r.room_id
    FROM reservations r
    WHERE r.check_in_date <= (CURRENT_DATE - INTERVAL '1 day')
      AND r.check_out_date >= (CURRENT_DATE - INTERVAL '1 day')
      AND r.status NOT IN ('cancelled', 'no-show')
  )
  UPDATE rooms
  SET 
    is_clean = false,  -- Fixed: was is_cleaned, now is_clean
    updated_at = exec_time
  FROM occupied_rooms
  WHERE rooms.id = occupied_rooms.room_id;
  
  GET DIAGNOSTICS affected_count = ROW_COUNT;
  
  -- Log the execution
  INSERT INTO room_cleaning_reset_log (rooms_reset, executed_at, triggered_by)
  VALUES (affected_count, exec_time, trigger_source);
  
  RETURN QUERY SELECT affected_count, exec_time;
END;
$$;


ALTER FUNCTION "public"."reset_daily_room_cleaning"("trigger_source" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_current_user_for_audit"("user_uuid" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    PERFORM set_config('app.current_user_id', user_uuid::TEXT, true);
END;
$$;


ALTER FUNCTION "public"."set_current_user_for_audit"("user_uuid" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_updated_at_column"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."validate_room_401_booking"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    room_number VARCHAR(10);
    nights INTEGER;
BEGIN
    -- Get room number
    SELECT r.number INTO room_number 
    FROM rooms r 
    WHERE r.id = NEW.room_id;
    
    -- Only apply validation to Room 401
    IF room_number = '401' THEN
        nights := NEW.check_out - NEW.check_in;
        
        -- Check minimum stay requirement (4 nights)
        IF nights < 4 THEN
            RAISE EXCEPTION 'Room 401 requires minimum 4 night stay. Attempted booking: % nights', nights;
        END IF;
        
        -- Check for conflicting reservations within cleaning buffer
        IF EXISTS (
            SELECT 1 FROM reservations r
            WHERE r.room_id = NEW.room_id 
            AND r.id != COALESCE(NEW.id, uuid_nil())
            AND r.status NOT IN ('cancelled', 'no-show')
            AND (
                -- Overlapping dates
                (r.check_in < NEW.check_out AND r.check_out > NEW.check_in)
                -- Or within 1-day cleaning buffer
                OR (r.check_out = NEW.check_in OR r.check_in = NEW.check_out)
            )
        ) THEN
            RAISE EXCEPTION 'Room 401 booking conflicts with existing reservation or cleaning requirements';
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."validate_room_401_booking"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."audit_logs" (
    "id" integer NOT NULL,
    "user_id" "uuid",
    "action" character varying(50) NOT NULL,
    "table_name" character varying(50) NOT NULL,
    "record_id" "text",
    "old_values" "jsonb",
    "new_values" "jsonb",
    "description" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."audit_logs" OWNER TO "postgres";


COMMENT ON COLUMN "public"."audit_logs"."record_id" IS 'Primary key value from the audited table (supports both integer and UUID types)';



CREATE SEQUENCE IF NOT EXISTS "public"."audit_logs_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."audit_logs_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."audit_logs_id_seq" OWNED BY "public"."audit_logs"."id";



CREATE TABLE IF NOT EXISTS "public"."booking_sources" (
    "id" integer NOT NULL,
    "code" character varying(20) NOT NULL,
    "name" character varying(100) NOT NULL,
    "default_commission_rate" numeric(5,4) DEFAULT 0.0000,
    "api_config" "jsonb",
    "color" character varying(7) DEFAULT '#6B7280'::character varying,
    "icon" character varying(50),
    "is_active" boolean DEFAULT true,
    "display_order" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."booking_sources" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."booking_sources_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."booking_sources_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."booking_sources_id_seq" OWNED BY "public"."booking_sources"."id";



CREATE TABLE IF NOT EXISTS "public"."categories" (
    "id" integer NOT NULL,
    "name" character varying(100) NOT NULL,
    "description" "text",
    "requires_expiration" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."categories" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."categories_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."categories_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."categories_id_seq" OWNED BY "public"."categories"."id";



CREATE TABLE IF NOT EXISTS "public"."companies" (
    "id" integer NOT NULL,
    "name" character varying(255) NOT NULL,
    "oib" character varying(11),
    "address" "text" NOT NULL,
    "city" character varying(100) NOT NULL,
    "postal_code" character varying(20) NOT NULL,
    "country" character varying(3) DEFAULT 'HR'::character varying,
    "contact_person" character varying(255) NOT NULL,
    "email" character varying(255) NOT NULL,
    "phone" character varying(50),
    "fax" character varying(50),
    "pricing_tier_id" integer,
    "room_allocation_guarantee" integer DEFAULT 0,
    "is_active" boolean DEFAULT true,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "valid_email" CHECK ((("email")::"text" ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'::"text")),
    CONSTRAINT "valid_oib" CHECK ((("oib" IS NULL) OR (("oib")::"text" ~ '^[0-9]{11}$'::"text")))
);


ALTER TABLE "public"."companies" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."companies_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."companies_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."companies_id_seq" OWNED BY "public"."companies"."id";



CREATE TABLE IF NOT EXISTS "public"."daily_guest_services" (
    "id" integer NOT NULL,
    "guest_stay_id" integer NOT NULL,
    "service_date" "date" NOT NULL,
    "parking_spots" integer DEFAULT 0,
    "pet_fee" boolean DEFAULT false,
    "extra_towels" integer DEFAULT 0,
    "extra_bed" boolean DEFAULT false,
    "minibar_consumed" "jsonb" DEFAULT '{}'::"jsonb",
    "tourism_tax_paid" boolean DEFAULT false,
    "tourism_tax_amount" numeric(10,2) DEFAULT 0,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "valid_extra_towels" CHECK (("extra_towels" >= 0)),
    CONSTRAINT "valid_parking_spots" CHECK (("parking_spots" >= 0)),
    CONSTRAINT "valid_tourism_tax" CHECK (("tourism_tax_amount" >= (0)::numeric))
);


ALTER TABLE "public"."daily_guest_services" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."daily_guest_services_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."daily_guest_services_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."daily_guest_services_id_seq" OWNED BY "public"."daily_guest_services"."id";



CREATE TABLE IF NOT EXISTS "public"."fiscal_records" (
    "id" integer NOT NULL,
    "invoice_id" integer NOT NULL,
    "jir" character varying(36),
    "zki" character varying(32) NOT NULL,
    "submitted_at" timestamp with time zone DEFAULT "now"(),
    "response_status" character varying(20) DEFAULT 'pending'::character varying,
    "response_message" "text",
    "qr_code_data" "text",
    "operator_oib" character varying(11),
    "business_space_code" character varying(20),
    "register_number" integer,
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "valid_jir" CHECK ((("jir" IS NULL) OR (("jir")::"text" ~ '^[0-9a-f-]{36}$'::"text"))),
    CONSTRAINT "valid_response_status" CHECK ((("response_status")::"text" = ANY (ARRAY[('pending'::character varying)::"text", ('success'::character varying)::"text", ('error'::character varying)::"text", ('timeout'::character varying)::"text"]))),
    CONSTRAINT "valid_zki" CHECK ((("zki")::"text" ~ '^[0-9a-f]{32}$'::"text"))
);


ALTER TABLE "public"."fiscal_records" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."fiscal_records_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."fiscal_records_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."fiscal_records_id_seq" OWNED BY "public"."fiscal_records"."id";



CREATE TABLE IF NOT EXISTS "public"."guest_children" (
    "id" integer NOT NULL,
    "reservation_id" integer,
    "name" character varying(100) NOT NULL,
    "date_of_birth" "date" NOT NULL,
    "age" integer,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "guest_id" integer,
    "discount_category" character varying(20)
);


ALTER TABLE "public"."guest_children" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."guest_children_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."guest_children_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."guest_children_id_seq" OWNED BY "public"."guest_children"."id";



CREATE TABLE IF NOT EXISTS "public"."guest_stays" (
    "id" integer NOT NULL,
    "reservation_id" integer NOT NULL,
    "guest_id" integer NOT NULL,
    "check_in" timestamp with time zone NOT NULL,
    "check_out" timestamp with time zone NOT NULL,
    "actual_check_in" timestamp with time zone,
    "actual_check_out" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "valid_actual_dates" CHECK ((("actual_check_out" IS NULL) OR ("actual_check_in" IS NULL) OR ("actual_check_out" > "actual_check_in"))),
    CONSTRAINT "valid_stay_dates" CHECK (("check_out" > "check_in"))
);


ALTER TABLE "public"."guest_stays" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."guest_stays_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."guest_stays_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."guest_stays_id_seq" OWNED BY "public"."guest_stays"."id";



CREATE TABLE IF NOT EXISTS "public"."guests" (
    "id" integer NOT NULL,
    "first_name" character varying(100) NOT NULL,
    "last_name" character varying(100) NOT NULL,
    "email" character varying(255),
    "phone" character varying(50),
    "nationality" character varying(100),
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "date_of_birth" "date",
    "passport_number" character varying(50),
    "id_card_number" character varying(50),
    "preferred_language" character varying(10) DEFAULT 'en'::character varying,
    "dietary_restrictions" "text"[],
    "special_needs" "text",
    "has_pets" boolean DEFAULT false,
    "is_vip" boolean DEFAULT false,
    "vip_level" integer DEFAULT 0,
    "marketing_consent" boolean DEFAULT false,
    "total_stays" integer DEFAULT 0,
    "total_spent" numeric(12,2) DEFAULT 0,
    "average_rating" numeric(3,2),
    "last_stay_date" "date",
    "notes" "text",
    "phobs_guest_id" character varying(100),
    "country_code" character varying(3),
    "full_name" character varying(255),
    CONSTRAINT "valid_rating" CHECK ((("average_rating" IS NULL) OR (("average_rating" >= (1)::numeric) AND ("average_rating" <= (5)::numeric)))),
    CONSTRAINT "valid_vip_level" CHECK ((("vip_level" >= 0) AND ("vip_level" <= 5)))
);


ALTER TABLE "public"."guests" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."guests_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."guests_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."guests_id_seq" OWNED BY "public"."guests"."id";



CREATE TABLE IF NOT EXISTS "public"."hotels" (
    "id" integer NOT NULL,
    "name" "text" NOT NULL,
    "address" "jsonb",
    "contact_info" "jsonb",
    "oib" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."hotels" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."hotels_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."hotels_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."hotels_id_seq" OWNED BY "public"."hotels"."id";



CREATE TABLE IF NOT EXISTS "public"."inventory" (
    "id" integer NOT NULL,
    "item_id" integer NOT NULL,
    "location_id" integer NOT NULL,
    "quantity" integer DEFAULT 0 NOT NULL,
    "expiration_date" "date",
    "cost_per_unit" numeric(10,2),
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "display_order" integer NOT NULL
);


ALTER TABLE "public"."inventory" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."inventory_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."inventory_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."inventory_id_seq" OWNED BY "public"."inventory"."id";



CREATE TABLE IF NOT EXISTS "public"."invoices" (
    "id" integer NOT NULL,
    "invoice_number" character varying(50) NOT NULL,
    "reservation_id" integer NOT NULL,
    "guest_id" integer,
    "company_id" integer,
    "issue_date" "date" DEFAULT CURRENT_DATE,
    "due_date" "date" DEFAULT (CURRENT_DATE + '30 days'::interval),
    "paid_date" "date",
    "subtotal" numeric(12,2) NOT NULL,
    "children_discounts" numeric(10,2) DEFAULT 0,
    "tourism_tax" numeric(10,2) DEFAULT 0,
    "vat_amount" numeric(10,2) NOT NULL,
    "pet_fee" numeric(10,2) DEFAULT 0,
    "parking_fee" numeric(10,2) DEFAULT 0,
    "short_stay_supplement" numeric(10,2) DEFAULT 0,
    "additional_charges" numeric(10,2) DEFAULT 0,
    "total_amount" numeric(12,2) NOT NULL,
    "paid_amount" numeric(12,2) DEFAULT 0,
    "balance_due" numeric(12,2) GENERATED ALWAYS AS (("total_amount" - "paid_amount")) STORED,
    "status" character varying(20) DEFAULT 'draft'::character varying,
    "pdf_path" "text",
    "email_sent_at" timestamp with time zone,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "billing_target" CHECK ((("guest_id" IS NOT NULL) OR ("company_id" IS NOT NULL))),
    CONSTRAINT "valid_amounts" CHECK ((("total_amount" >= (0)::numeric) AND ("paid_amount" >= (0)::numeric))),
    CONSTRAINT "valid_status" CHECK ((("status")::"text" = ANY (ARRAY[('draft'::character varying)::"text", ('sent'::character varying)::"text", ('paid'::character varying)::"text", ('overdue'::character varying)::"text", ('cancelled'::character varying)::"text"])))
);


ALTER TABLE "public"."invoices" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."invoices_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."invoices_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."invoices_id_seq" OWNED BY "public"."invoices"."id";



CREATE TABLE IF NOT EXISTS "public"."items" (
    "id" integer NOT NULL,
    "name" character varying(200) NOT NULL,
    "description" "text",
    "category_id" integer NOT NULL,
    "unit" character varying(20) DEFAULT 'pieces'::character varying,
    "price" numeric(10,2),
    "minimum_stock" integer DEFAULT 0,
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."items" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."items_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."items_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."items_id_seq" OWNED BY "public"."items"."id";



CREATE TABLE IF NOT EXISTS "public"."locations" (
    "id" integer NOT NULL,
    "name" character varying(100) NOT NULL,
    "type" character varying(50) DEFAULT 'storage'::character varying,
    "description" "text",
    "is_refrigerated" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."locations" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."locations_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."locations_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."locations_id_seq" OWNED BY "public"."locations"."id";



CREATE TABLE IF NOT EXISTS "public"."payments" (
    "id" integer NOT NULL,
    "invoice_id" integer,
    "reservation_id" integer,
    "amount" numeric(12,2) NOT NULL,
    "currency" character varying(3) DEFAULT 'EUR'::character varying,
    "payment_method" character varying(50) NOT NULL,
    "payment_reference" character varying(100),
    "card_last_four" character varying(4),
    "card_type" character varying(20),
    "authorization_code" character varying(50),
    "status" character varying(20) DEFAULT 'pending'::character varying,
    "received_date" timestamp with time zone DEFAULT "now"(),
    "processed_date" timestamp with time zone,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "valid_amount" CHECK (("amount" > (0)::numeric)),
    CONSTRAINT "valid_method" CHECK ((("payment_method")::"text" = ANY (ARRAY[('cash'::character varying)::"text", ('credit_card'::character varying)::"text", ('debit_card'::character varying)::"text", ('bank_transfer'::character varying)::"text", ('other'::character varying)::"text"]))),
    CONSTRAINT "valid_status" CHECK ((("status")::"text" = ANY (ARRAY[('pending'::character varying)::"text", ('completed'::character varying)::"text", ('failed'::character varying)::"text", ('cancelled'::character varying)::"text", ('refunded'::character varying)::"text"])))
);


ALTER TABLE "public"."payments" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."payments_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."payments_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."payments_id_seq" OWNED BY "public"."payments"."id";



CREATE TABLE IF NOT EXISTS "public"."phobs_availability" (
    "id" integer NOT NULL,
    "room_mapping_id" integer,
    "rate_plan_id" integer,
    "date" "date" NOT NULL,
    "available_rooms" integer DEFAULT 0 NOT NULL,
    "total_rooms" integer DEFAULT 1 NOT NULL,
    "rate" numeric(10,2) NOT NULL,
    "currency" character varying(3) DEFAULT 'EUR'::character varying,
    "minimum_stay" integer DEFAULT 1,
    "maximum_stay" integer DEFAULT 30,
    "close_to_arrival" boolean DEFAULT false,
    "close_to_departure" boolean DEFAULT false,
    "stop_sale" boolean DEFAULT false,
    "channel_availability" "jsonb" DEFAULT '{}'::"jsonb",
    "last_updated" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."phobs_availability" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."phobs_availability_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."phobs_availability_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."phobs_availability_id_seq" OWNED BY "public"."phobs_availability"."id";



CREATE TABLE IF NOT EXISTS "public"."phobs_channel_metrics" (
    "id" integer NOT NULL,
    "channel_id" character varying(50) NOT NULL,
    "channel_name" character varying(100) NOT NULL,
    "start_date" "date" NOT NULL,
    "end_date" "date" NOT NULL,
    "period_type" character varying(20) NOT NULL,
    "total_bookings" integer DEFAULT 0,
    "total_revenue" numeric(12,2) DEFAULT 0,
    "average_booking_value" numeric(10,2) DEFAULT 0,
    "conversion_rate" numeric(5,4) DEFAULT 0,
    "sync_success_rate" numeric(5,4) DEFAULT 0,
    "average_sync_time_ms" integer DEFAULT 0,
    "error_rate" numeric(5,4) DEFAULT 0,
    "period_over_period_growth" numeric(5,4) DEFAULT 0,
    "market_share" numeric(5,4) DEFAULT 0,
    "top_room_types" "text"[],
    "top_periods" "text"[],
    "common_errors" "text"[],
    "conflicts_detected" integer DEFAULT 0,
    "conflicts_resolved" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."phobs_channel_metrics" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."phobs_channel_metrics_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."phobs_channel_metrics_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."phobs_channel_metrics_id_seq" OWNED BY "public"."phobs_channel_metrics"."id";



CREATE TABLE IF NOT EXISTS "public"."phobs_channel_status" (
    "channel_name" character varying(50) NOT NULL,
    "status" character varying(20) NOT NULL,
    "last_sync" timestamp with time zone,
    "error_count" integer DEFAULT 0,
    "last_error" "text",
    "sync_success_rate" numeric(5,4) DEFAULT 0,
    "average_sync_time_ms" integer DEFAULT 0,
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."phobs_channel_status" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."phobs_channels" (
    "id" integer NOT NULL,
    "channel_id" character varying(50) NOT NULL,
    "channel_name" character varying(100) NOT NULL,
    "display_name" character varying(100) NOT NULL,
    "status" character varying(20) DEFAULT 'active'::character varying,
    "is_enabled" boolean DEFAULT true,
    "commission_rate" numeric(5,4) DEFAULT 0,
    "allow_instant_booking" boolean DEFAULT true,
    "minimum_stay" integer DEFAULT 1,
    "maximum_stay" integer DEFAULT 30,
    "cutoff_hours" integer DEFAULT 1,
    "base_rate_adjustment" numeric(5,4) DEFAULT 0,
    "availability_enabled" boolean DEFAULT true,
    "total_bookings" integer DEFAULT 0,
    "total_revenue" numeric(12,2) DEFAULT 0,
    "average_booking_value" numeric(10,2) DEFAULT 0,
    "conversion_rate" numeric(5,4) DEFAULT 0,
    "last_booking_at" timestamp with time zone,
    "last_sync_at" timestamp with time zone,
    "sync_status" character varying(20) DEFAULT 'pending'::character varying,
    "sync_errors" "text"[],
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."phobs_channels" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."phobs_channels_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."phobs_channels_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."phobs_channels_id_seq" OWNED BY "public"."phobs_channels"."id";



CREATE TABLE IF NOT EXISTS "public"."phobs_conflicts" (
    "id" integer NOT NULL,
    "conflict_id" character varying(100) NOT NULL,
    "conflict_type" character varying(50) NOT NULL,
    "severity" character varying(20) NOT NULL,
    "internal_data" "jsonb",
    "phobs_data" "jsonb",
    "channel_data" "jsonb",
    "suggested_action" character varying(50),
    "auto_resolvable" boolean DEFAULT false,
    "status" character varying(20) DEFAULT 'detected'::character varying,
    "resolved_at" timestamp with time zone,
    "resolved_by" character varying(100),
    "affected_reservations" "text"[],
    "channel" character varying(50),
    "detected_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."phobs_conflicts" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."phobs_conflicts_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."phobs_conflicts_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."phobs_conflicts_id_seq" OWNED BY "public"."phobs_conflicts"."id";



CREATE TABLE IF NOT EXISTS "public"."phobs_rate_plans" (
    "id" integer NOT NULL,
    "rate_id" character varying(100) NOT NULL,
    "name" character varying(255) NOT NULL,
    "description" "text",
    "base_rate" numeric(10,2) NOT NULL,
    "currency" character varying(3) DEFAULT 'EUR'::character varying,
    "seasonal_adjustments" "jsonb" DEFAULT '{}'::"jsonb",
    "channel_rates" "jsonb" DEFAULT '{}'::"jsonb",
    "minimum_stay" integer DEFAULT 1,
    "maximum_stay" integer DEFAULT 30,
    "advance_booking_days" integer DEFAULT 0,
    "is_active" boolean DEFAULT true,
    "valid_from" "date",
    "valid_to" "date",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."phobs_rate_plans" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."phobs_rate_plans_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."phobs_rate_plans_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."phobs_rate_plans_id_seq" OWNED BY "public"."phobs_rate_plans"."id";



CREATE TABLE IF NOT EXISTS "public"."phobs_room_mappings" (
    "id" integer NOT NULL,
    "internal_room_id" integer,
    "phobs_room_id" character varying(100) NOT NULL,
    "channel_room_mappings" "jsonb" DEFAULT '{}'::"jsonb",
    "amenities" "text"[],
    "descriptions" "jsonb" DEFAULT '{}'::"jsonb",
    "images" "text"[],
    "is_active" boolean DEFAULT true,
    "last_updated" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."phobs_room_mappings" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."phobs_room_mappings_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."phobs_room_mappings_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."phobs_room_mappings_id_seq" OWNED BY "public"."phobs_room_mappings"."id";



CREATE TABLE IF NOT EXISTS "public"."phobs_sync_log" (
    "id" integer NOT NULL,
    "operation" character varying(50) NOT NULL,
    "status" character varying(20) NOT NULL,
    "records_processed" integer DEFAULT 0,
    "records_successful" integer DEFAULT 0,
    "records_failed" integer DEFAULT 0,
    "operation_data" "jsonb",
    "errors" "text"[],
    "duration_ms" integer,
    "started_at" timestamp with time zone DEFAULT "now"(),
    "completed_at" timestamp with time zone
);


ALTER TABLE "public"."phobs_sync_log" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."phobs_sync_log_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."phobs_sync_log_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."phobs_sync_log_id_seq" OWNED BY "public"."phobs_sync_log"."id";



CREATE TABLE IF NOT EXISTS "public"."phobs_webhook_events" (
    "id" integer NOT NULL,
    "event_id" character varying(100) NOT NULL,
    "event_type" character varying(50) NOT NULL,
    "hotel_id" character varying(50) NOT NULL,
    "timestamp" timestamp with time zone NOT NULL,
    "data" "jsonb" NOT NULL,
    "headers" "jsonb",
    "status" character varying(20) DEFAULT 'pending'::character varying,
    "result" "jsonb",
    "processed_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."phobs_webhook_events" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."phobs_webhook_events_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."phobs_webhook_events_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."phobs_webhook_events_id_seq" OWNED BY "public"."phobs_webhook_events"."id";



CREATE TABLE IF NOT EXISTS "public"."pricing_seasons" (
    "id" integer NOT NULL,
    "hotel_id" integer DEFAULT 1,
    "name" character varying(100) NOT NULL,
    "code" character varying(10) NOT NULL,
    "start_date" "date" NOT NULL,
    "end_date" "date" NOT NULL,
    "year_pattern" integer,
    "priority" integer DEFAULT 1,
    "is_active" boolean DEFAULT true,
    "color" character varying(7) DEFAULT '#6B7280'::character varying,
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "valid_date_range" CHECK (("end_date" > "start_date"))
);


ALTER TABLE "public"."pricing_seasons" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."pricing_seasons_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."pricing_seasons_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."pricing_seasons_id_seq" OWNED BY "public"."pricing_seasons"."id";



CREATE TABLE IF NOT EXISTS "public"."pricing_tiers" (
    "id" integer NOT NULL,
    "name" character varying(255) NOT NULL,
    "description" "text",
    "seasonal_rate_a" numeric(4,3) DEFAULT 1.000,
    "seasonal_rate_b" numeric(4,3) DEFAULT 1.000,
    "seasonal_rate_c" numeric(4,3) DEFAULT 1.000,
    "seasonal_rate_d" numeric(4,3) DEFAULT 1.000,
    "is_percentage_discount" boolean DEFAULT true,
    "minimum_stay" integer,
    "valid_from" "date" NOT NULL,
    "valid_to" "date",
    "is_active" boolean DEFAULT true,
    "is_default" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "valid_rates" CHECK ((("seasonal_rate_a" >= (0)::numeric) AND ("seasonal_rate_b" >= (0)::numeric) AND ("seasonal_rate_c" >= (0)::numeric) AND ("seasonal_rate_d" >= (0)::numeric)))
);


ALTER TABLE "public"."pricing_tiers" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."pricing_tiers_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."pricing_tiers_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."pricing_tiers_id_seq" OWNED BY "public"."pricing_tiers"."id";



CREATE TABLE IF NOT EXISTS "public"."reservation_daily_details" (
    "id" integer NOT NULL,
    "reservation_id" integer NOT NULL,
    "stay_date" "date" NOT NULL,
    "adults_present" integer DEFAULT 1 NOT NULL,
    "children_present" integer[] DEFAULT '{}'::integer[],
    "parking_spots_needed" integer DEFAULT 0,
    "pets_present" boolean DEFAULT false,
    "towel_rentals" integer DEFAULT 0,
    "daily_base_accommodation" numeric(10,2),
    "daily_child_discounts" numeric(10,2) DEFAULT 0,
    "daily_service_fees" numeric(10,2) DEFAULT 0,
    "daily_total" numeric(10,2),
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."reservation_daily_details" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."reservation_daily_details_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."reservation_daily_details_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."reservation_daily_details_id_seq" OWNED BY "public"."reservation_daily_details"."id";



CREATE TABLE IF NOT EXISTS "public"."reservation_guests" (
    "id" integer NOT NULL,
    "reservation_id" integer NOT NULL,
    "guest_id" integer NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."reservation_guests" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."reservation_guests_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."reservation_guests_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."reservation_guests_id_seq" OWNED BY "public"."reservation_guests"."id";



CREATE TABLE IF NOT EXISTS "public"."reservation_statuses" (
    "id" integer NOT NULL,
    "code" character varying(20) NOT NULL,
    "name" character varying(100) NOT NULL,
    "color" character varying(7) DEFAULT '#6B7280'::character varying,
    "icon" character varying(50),
    "description" "text",
    "is_active" boolean DEFAULT true,
    "display_order" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."reservation_statuses" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."reservation_statuses_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."reservation_statuses_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."reservation_statuses_id_seq" OWNED BY "public"."reservation_statuses"."id";



CREATE OR REPLACE VIEW "public"."reservation_with_all_guests" AS
SELECT
    NULL::integer AS "id",
    NULL::integer AS "guest_id",
    NULL::integer AS "room_id",
    NULL::"date" AS "check_in_date",
    NULL::"date" AS "check_out_date",
    NULL::integer AS "number_of_nights",
    NULL::integer AS "number_of_guests",
    NULL::integer AS "adults",
    NULL::integer AS "children_count",
    NULL::character varying(50) AS "status",
    NULL::character varying(50) AS "booking_source",
    NULL::"text" AS "special_requests",
    NULL::"text" AS "internal_notes",
    NULL::character varying(10) AS "seasonal_period",
    NULL::numeric(10,2) AS "base_room_rate",
    NULL::numeric(10,2) AS "subtotal",
    NULL::numeric(10,2) AS "children_discounts",
    NULL::numeric(10,2) AS "tourism_tax",
    NULL::numeric(10,2) AS "vat_amount",
    NULL::numeric(10,2) AS "pet_fee",
    NULL::numeric(10,2) AS "parking_fee",
    NULL::numeric(10,2) AS "short_stay_supplement",
    NULL::numeric(10,2) AS "additional_charges",
    NULL::numeric(10,2) AS "total_amount",
    NULL::character varying(50) AS "payment_status",
    NULL::character varying(50) AS "payment_method",
    NULL::numeric(10,2) AS "deposit_amount",
    NULL::numeric(10,2) AS "balance_due",
    NULL::timestamp with time zone AS "booking_date",
    NULL::character varying(50) AS "confirmation_number",
    NULL::timestamp with time zone AS "created_at",
    NULL::timestamp with time zone AS "updated_at",
    NULL::integer AS "company_id",
    NULL::integer AS "pricing_tier_id",
    NULL::boolean AS "has_pets",
    NULL::boolean AS "parking_required",
    NULL::timestamp with time zone AS "last_modified",
    NULL::timestamp with time zone AS "checked_in_at",
    NULL::timestamp with time zone AS "checked_out_at",
    NULL::character varying(100) AS "phobs_reservation_id",
    NULL::character varying(100) AS "booking_reference",
    NULL::character varying(50) AS "ota_channel",
    NULL::numeric(5,4) AS "commission_rate",
    NULL::numeric(10,2) AS "commission_amount",
    NULL::numeric(10,2) AS "net_amount",
    NULL::character varying(20) AS "sync_status",
    NULL::"text"[] AS "sync_errors",
    NULL::timestamp with time zone AS "last_synced_at",
    NULL::json AS "all_guests";


ALTER VIEW "public"."reservation_with_all_guests" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."reservations" (
    "id" integer NOT NULL,
    "guest_id" integer NOT NULL,
    "room_id" integer NOT NULL,
    "check_in_date" "date" NOT NULL,
    "check_out_date" "date" NOT NULL,
    "number_of_nights" integer,
    "number_of_guests" integer DEFAULT 1 NOT NULL,
    "adults" integer DEFAULT 1 NOT NULL,
    "children_count" integer DEFAULT 0,
    "status" character varying(50) DEFAULT 'confirmed'::character varying,
    "booking_source" character varying(50) DEFAULT 'direct'::character varying,
    "special_requests" "text",
    "internal_notes" "text",
    "seasonal_period" character varying(10) NOT NULL,
    "base_room_rate" numeric(10,2) NOT NULL,
    "subtotal" numeric(10,2) NOT NULL,
    "children_discounts" numeric(10,2) DEFAULT 0,
    "tourism_tax" numeric(10,2) DEFAULT 0,
    "vat_amount" numeric(10,2) NOT NULL,
    "pet_fee" numeric(10,2) DEFAULT 0,
    "parking_fee" numeric(10,2) DEFAULT 0,
    "short_stay_supplement" numeric(10,2) DEFAULT 0,
    "additional_charges" numeric(10,2) DEFAULT 0,
    "total_amount" numeric(10,2) NOT NULL,
    "payment_status" character varying(50) DEFAULT 'pending'::character varying,
    "payment_method" character varying(50),
    "deposit_amount" numeric(10,2) DEFAULT 0,
    "balance_due" numeric(10,2),
    "booking_date" timestamp with time zone DEFAULT "now"(),
    "confirmation_number" character varying(50),
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "company_id" integer,
    "pricing_tier_id" integer,
    "has_pets" boolean DEFAULT false,
    "parking_required" boolean DEFAULT false,
    "last_modified" timestamp with time zone DEFAULT "now"(),
    "checked_in_at" timestamp with time zone,
    "checked_out_at" timestamp with time zone,
    "phobs_reservation_id" character varying(100),
    "booking_reference" character varying(100),
    "ota_channel" character varying(50),
    "commission_rate" numeric(5,4) DEFAULT 0,
    "commission_amount" numeric(10,2) DEFAULT 0,
    "net_amount" numeric(10,2),
    "sync_status" character varying(20) DEFAULT 'pending'::character varying,
    "sync_errors" "text"[],
    "last_synced_at" timestamp with time zone,
    "status_id" integer,
    "booking_source_id" integer,
    CONSTRAINT "reservations_booking_source_check" CHECK ((("booking_source")::"text" = ANY (ARRAY[('booking.com'::character varying)::"text", ('airbnb'::character varying)::"text", ('direct'::character varying)::"text", ('phone'::character varying)::"text", ('email'::character varying)::"text", ('walk-in'::character varying)::"text", ('other'::character varying)::"text"]))),
    CONSTRAINT "reservations_payment_status_check" CHECK ((("payment_status")::"text" = ANY (ARRAY[('pending'::character varying)::"text", ('partial'::character varying)::"text", ('paid'::character varying)::"text", ('refunded'::character varying)::"text", ('cancelled'::character varying)::"text"]))),
    CONSTRAINT "reservations_seasonal_period_check" CHECK ((("seasonal_period")::"text" = ANY (ARRAY[('A'::character varying)::"text", ('B'::character varying)::"text", ('C'::character varying)::"text", ('D'::character varying)::"text"]))),
    CONSTRAINT "reservations_status_check" CHECK ((("status")::"text" = ANY (ARRAY[('confirmed'::character varying)::"text", ('checked-in'::character varying)::"text", ('checked-out'::character varying)::"text", ('cancelled'::character varying)::"text", ('no-show'::character varying)::"text", ('room-closure'::character varying)::"text", ('unallocated'::character varying)::"text", ('incomplete-payment'::character varying)::"text"]))),
    CONSTRAINT "valid_amounts" CHECK ((("total_amount" >= (0)::numeric) AND ("base_room_rate" >= (0)::numeric))),
    CONSTRAINT "valid_children" CHECK (("children_count" >= 0)),
    CONSTRAINT "valid_dates" CHECK (("check_out_date" > "check_in_date")),
    CONSTRAINT "valid_guests" CHECK ((("adults" > 0) AND ("number_of_guests" >= "adults")))
);


ALTER TABLE "public"."reservations" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."reservations_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."reservations_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."reservations_id_seq" OWNED BY "public"."reservations"."id";



CREATE OR REPLACE VIEW "public"."reservations_with_enums" AS
 SELECT "r"."id",
    "r"."guest_id",
    "r"."room_id",
    "r"."check_in_date",
    "r"."check_out_date",
    "r"."number_of_nights",
    "r"."number_of_guests",
    "r"."adults",
    "r"."children_count",
    "r"."status",
    "r"."booking_source",
    "r"."special_requests",
    "r"."internal_notes",
    "r"."seasonal_period",
    "r"."base_room_rate",
    "r"."subtotal",
    "r"."children_discounts",
    "r"."tourism_tax",
    "r"."vat_amount",
    "r"."pet_fee",
    "r"."parking_fee",
    "r"."short_stay_supplement",
    "r"."additional_charges",
    "r"."total_amount",
    "r"."payment_status",
    "r"."payment_method",
    "r"."deposit_amount",
    "r"."balance_due",
    "r"."booking_date",
    "r"."confirmation_number",
    "r"."created_at",
    "r"."updated_at",
    "r"."company_id",
    "r"."pricing_tier_id",
    "r"."has_pets",
    "r"."parking_required",
    "r"."last_modified",
    "r"."checked_in_at",
    "r"."checked_out_at",
    "r"."phobs_reservation_id",
    "r"."booking_reference",
    "r"."ota_channel",
    "r"."commission_rate",
    "r"."commission_amount",
    "r"."net_amount",
    "r"."sync_status",
    "r"."sync_errors",
    "r"."last_synced_at",
    "r"."status_id",
    "r"."booking_source_id",
    COALESCE("rs"."code", "r"."status") AS "status_code",
    COALESCE("rs"."name", "r"."status") AS "status_name",
    "rs"."color" AS "status_color",
    "rs"."icon" AS "status_icon",
    COALESCE("bs"."code", "r"."booking_source") AS "booking_source_code",
    COALESCE("bs"."name", "r"."booking_source") AS "booking_source_name",
    "bs"."default_commission_rate",
    "bs"."color" AS "booking_source_color",
    "bs"."icon" AS "booking_source_icon"
   FROM (("public"."reservations" "r"
     LEFT JOIN "public"."reservation_statuses" "rs" ON (("r"."status_id" = "rs"."id")))
     LEFT JOIN "public"."booking_sources" "bs" ON (("r"."booking_source_id" = "bs"."id")));


ALTER VIEW "public"."reservations_with_enums" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."room_cleaning_reset_log" (
    "id" integer NOT NULL,
    "rooms_reset" integer NOT NULL,
    "executed_at" timestamp with time zone DEFAULT "now"(),
    "triggered_by" "text" DEFAULT 'automatic'::"text"
);


ALTER TABLE "public"."room_cleaning_reset_log" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."room_cleaning_reset_log_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."room_cleaning_reset_log_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."room_cleaning_reset_log_id_seq" OWNED BY "public"."room_cleaning_reset_log"."id";



CREATE TABLE IF NOT EXISTS "public"."room_pricing" (
    "id" integer NOT NULL,
    "room_id" integer,
    "season_id" integer,
    "base_rate" numeric(10,2) NOT NULL,
    "currency" character varying(3) DEFAULT 'EUR'::character varying,
    "valid_from" "date" NOT NULL,
    "valid_to" "date",
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "positive_rate" CHECK (("base_rate" > (0)::numeric)),
    CONSTRAINT "valid_pricing_dates" CHECK ((("valid_to" IS NULL) OR ("valid_to" > "valid_from")))
);


ALTER TABLE "public"."room_pricing" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."room_pricing_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."room_pricing_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."room_pricing_id_seq" OWNED BY "public"."room_pricing"."id";



CREATE TABLE IF NOT EXISTS "public"."room_service_orders" (
    "id" integer NOT NULL,
    "reservation_id" integer,
    "item_name" character varying(200) NOT NULL,
    "category" character varying(100),
    "quantity" integer DEFAULT 1 NOT NULL,
    "unit_price" numeric(10,2) NOT NULL,
    "total_price" numeric(10,2),
    "ordered_at" timestamp with time zone DEFAULT "now"(),
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."room_service_orders" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."room_service_orders_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."room_service_orders_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."room_service_orders_id_seq" OWNED BY "public"."room_service_orders"."id";



CREATE TABLE IF NOT EXISTS "public"."room_types" (
    "id" integer NOT NULL,
    "code" character varying(20) NOT NULL,
    "name" character varying(100) NOT NULL,
    "max_occupancy" integer NOT NULL,
    "base_area_sqm" integer,
    "description" "text",
    "color" character varying(7) DEFAULT '#6B7280'::character varying,
    "icon" character varying(50),
    "is_active" boolean DEFAULT true,
    "display_order" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."room_types" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."room_types_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."room_types_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."room_types_id_seq" OWNED BY "public"."room_types"."id";



CREATE TABLE IF NOT EXISTS "public"."rooms" (
    "id" integer NOT NULL,
    "room_number" character varying(10) NOT NULL,
    "floor_number" integer NOT NULL,
    "room_type" character varying(50) NOT NULL,
    "max_occupancy" integer DEFAULT 2,
    "is_premium" boolean DEFAULT false,
    "seasonal_rate_a" numeric(10,2),
    "seasonal_rate_b" numeric(10,2),
    "seasonal_rate_c" numeric(10,2),
    "seasonal_rate_d" numeric(10,2),
    "amenities" "jsonb" DEFAULT '[]'::"jsonb",
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "is_clean" boolean DEFAULT false,
    "room_type_id" integer
);


ALTER TABLE "public"."rooms" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."rooms_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."rooms_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."rooms_id_seq" OWNED BY "public"."rooms"."id";



CREATE OR REPLACE VIEW "public"."rooms_with_enums" AS
 SELECT "r"."id",
    "r"."room_number",
    "r"."floor_number",
    "r"."room_type",
    "r"."max_occupancy",
    "r"."is_premium",
    "r"."seasonal_rate_a",
    "r"."seasonal_rate_b",
    "r"."seasonal_rate_c",
    "r"."seasonal_rate_d",
    "r"."amenities",
    "r"."is_active",
    "r"."created_at",
    "r"."updated_at",
    "r"."is_clean",
    "r"."room_type_id",
    COALESCE("rt"."code", "r"."room_type") AS "room_type_code",
    COALESCE("rt"."name", "r"."room_type") AS "room_type_name",
    "rt"."max_occupancy" AS "type_max_occupancy",
    "rt"."color" AS "room_type_color",
    "rt"."icon" AS "room_type_icon",
    "rt"."description" AS "room_type_description"
   FROM ("public"."rooms" "r"
     LEFT JOIN "public"."room_types" "rt" ON (("r"."room_type_id" = "rt"."id")));


ALTER VIEW "public"."rooms_with_enums" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_profiles" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "role_id" integer NOT NULL,
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "push_notifications_enabled" boolean DEFAULT false,
    "push_subscription" "text"
);


ALTER TABLE "public"."user_profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_roles" (
    "id" integer NOT NULL,
    "name" character varying(50) NOT NULL,
    "description" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."user_roles" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."user_roles_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."user_roles_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."user_roles_id_seq" OWNED BY "public"."user_roles"."id";



ALTER TABLE ONLY "public"."audit_logs" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."audit_logs_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."booking_sources" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."booking_sources_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."categories" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."categories_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."companies" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."companies_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."daily_guest_services" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."daily_guest_services_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."fiscal_records" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."fiscal_records_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."guest_children" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."guest_children_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."guest_stays" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."guest_stays_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."guests" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."guests_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."hotels" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."hotels_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."inventory" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."inventory_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."invoices" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."invoices_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."items" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."items_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."locations" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."locations_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."payments" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."payments_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."phobs_availability" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."phobs_availability_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."phobs_channel_metrics" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."phobs_channel_metrics_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."phobs_channels" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."phobs_channels_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."phobs_conflicts" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."phobs_conflicts_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."phobs_rate_plans" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."phobs_rate_plans_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."phobs_room_mappings" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."phobs_room_mappings_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."phobs_sync_log" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."phobs_sync_log_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."phobs_webhook_events" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."phobs_webhook_events_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."pricing_seasons" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."pricing_seasons_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."pricing_tiers" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."pricing_tiers_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."reservation_daily_details" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."reservation_daily_details_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."reservation_guests" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."reservation_guests_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."reservation_statuses" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."reservation_statuses_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."reservations" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."reservations_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."room_cleaning_reset_log" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."room_cleaning_reset_log_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."room_pricing" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."room_pricing_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."room_service_orders" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."room_service_orders_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."room_types" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."room_types_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."rooms" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."rooms_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."user_roles" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."user_roles_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."audit_logs"
    ADD CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."booking_sources"
    ADD CONSTRAINT "booking_sources_code_key" UNIQUE ("code");



ALTER TABLE ONLY "public"."booking_sources"
    ADD CONSTRAINT "booking_sources_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."categories"
    ADD CONSTRAINT "categories_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."categories"
    ADD CONSTRAINT "categories_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."companies"
    ADD CONSTRAINT "companies_oib_key" UNIQUE ("oib");



ALTER TABLE ONLY "public"."companies"
    ADD CONSTRAINT "companies_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."daily_guest_services"
    ADD CONSTRAINT "daily_guest_services_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."fiscal_records"
    ADD CONSTRAINT "fiscal_records_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."guest_children"
    ADD CONSTRAINT "guest_children_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."guest_stays"
    ADD CONSTRAINT "guest_stays_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."guests"
    ADD CONSTRAINT "guests_email_key" UNIQUE ("email");



ALTER TABLE ONLY "public"."guests"
    ADD CONSTRAINT "guests_phobs_guest_id_key" UNIQUE ("phobs_guest_id");



ALTER TABLE ONLY "public"."guests"
    ADD CONSTRAINT "guests_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."hotels"
    ADD CONSTRAINT "hotels_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."inventory"
    ADD CONSTRAINT "inventory_item_id_location_id_expiration_date_key" UNIQUE ("item_id", "location_id", "expiration_date");



ALTER TABLE ONLY "public"."inventory"
    ADD CONSTRAINT "inventory_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."invoices"
    ADD CONSTRAINT "invoices_invoice_number_key" UNIQUE ("invoice_number");



ALTER TABLE ONLY "public"."invoices"
    ADD CONSTRAINT "invoices_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."items"
    ADD CONSTRAINT "items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."locations"
    ADD CONSTRAINT "locations_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."locations"
    ADD CONSTRAINT "locations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."payments"
    ADD CONSTRAINT "payments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."phobs_availability"
    ADD CONSTRAINT "phobs_availability_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."phobs_availability"
    ADD CONSTRAINT "phobs_availability_room_mapping_id_rate_plan_id_date_key" UNIQUE ("room_mapping_id", "rate_plan_id", "date");



ALTER TABLE ONLY "public"."phobs_channel_metrics"
    ADD CONSTRAINT "phobs_channel_metrics_channel_id_start_date_end_date_period_key" UNIQUE ("channel_id", "start_date", "end_date", "period_type");



ALTER TABLE ONLY "public"."phobs_channel_metrics"
    ADD CONSTRAINT "phobs_channel_metrics_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."phobs_channel_status"
    ADD CONSTRAINT "phobs_channel_status_pkey" PRIMARY KEY ("channel_name");



ALTER TABLE ONLY "public"."phobs_channels"
    ADD CONSTRAINT "phobs_channels_channel_id_key" UNIQUE ("channel_id");



ALTER TABLE ONLY "public"."phobs_channels"
    ADD CONSTRAINT "phobs_channels_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."phobs_conflicts"
    ADD CONSTRAINT "phobs_conflicts_conflict_id_key" UNIQUE ("conflict_id");



ALTER TABLE ONLY "public"."phobs_conflicts"
    ADD CONSTRAINT "phobs_conflicts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."phobs_rate_plans"
    ADD CONSTRAINT "phobs_rate_plans_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."phobs_rate_plans"
    ADD CONSTRAINT "phobs_rate_plans_rate_id_key" UNIQUE ("rate_id");



ALTER TABLE ONLY "public"."phobs_room_mappings"
    ADD CONSTRAINT "phobs_room_mappings_internal_room_id_phobs_room_id_key" UNIQUE ("internal_room_id", "phobs_room_id");



ALTER TABLE ONLY "public"."phobs_room_mappings"
    ADD CONSTRAINT "phobs_room_mappings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."phobs_sync_log"
    ADD CONSTRAINT "phobs_sync_log_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."phobs_webhook_events"
    ADD CONSTRAINT "phobs_webhook_events_event_id_key" UNIQUE ("event_id");



ALTER TABLE ONLY "public"."phobs_webhook_events"
    ADD CONSTRAINT "phobs_webhook_events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."pricing_seasons"
    ADD CONSTRAINT "pricing_seasons_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."pricing_tiers"
    ADD CONSTRAINT "pricing_tiers_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."pricing_tiers"
    ADD CONSTRAINT "pricing_tiers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."reservation_daily_details"
    ADD CONSTRAINT "reservation_daily_details_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."reservation_daily_details"
    ADD CONSTRAINT "reservation_daily_details_reservation_id_stay_date_key" UNIQUE ("reservation_id", "stay_date");



ALTER TABLE ONLY "public"."reservation_guests"
    ADD CONSTRAINT "reservation_guests_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."reservation_statuses"
    ADD CONSTRAINT "reservation_statuses_code_key" UNIQUE ("code");



ALTER TABLE ONLY "public"."reservation_statuses"
    ADD CONSTRAINT "reservation_statuses_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."reservations"
    ADD CONSTRAINT "reservations_confirmation_number_key" UNIQUE ("confirmation_number");



ALTER TABLE ONLY "public"."reservations"
    ADD CONSTRAINT "reservations_phobs_reservation_id_key" UNIQUE ("phobs_reservation_id");



ALTER TABLE ONLY "public"."reservations"
    ADD CONSTRAINT "reservations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."room_cleaning_reset_log"
    ADD CONSTRAINT "room_cleaning_reset_log_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."room_pricing"
    ADD CONSTRAINT "room_pricing_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."room_service_orders"
    ADD CONSTRAINT "room_service_orders_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."room_types"
    ADD CONSTRAINT "room_types_code_key" UNIQUE ("code");



ALTER TABLE ONLY "public"."room_types"
    ADD CONSTRAINT "room_types_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."rooms"
    ADD CONSTRAINT "rooms_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."rooms"
    ADD CONSTRAINT "rooms_room_number_key" UNIQUE ("room_number");



ALTER TABLE ONLY "public"."daily_guest_services"
    ADD CONSTRAINT "unique_guest_service_date" UNIQUE ("guest_stay_id", "service_date");



ALTER TABLE ONLY "public"."guest_stays"
    ADD CONSTRAINT "unique_guest_stay" UNIQUE ("reservation_id", "guest_id");



ALTER TABLE ONLY "public"."reservation_guests"
    ADD CONSTRAINT "unique_reservation_guest" UNIQUE ("reservation_id", "guest_id");



ALTER TABLE ONLY "public"."room_pricing"
    ADD CONSTRAINT "unique_room_season_date" UNIQUE ("room_id", "season_id", "valid_from");



ALTER TABLE ONLY "public"."pricing_seasons"
    ADD CONSTRAINT "unique_season_code" UNIQUE ("hotel_id", "code", "year_pattern");



ALTER TABLE ONLY "public"."user_profiles"
    ADD CONSTRAINT "user_profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_profiles"
    ADD CONSTRAINT "user_profiles_user_id_key" UNIQUE ("user_id");



ALTER TABLE ONLY "public"."user_roles"
    ADD CONSTRAINT "user_roles_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."user_roles"
    ADD CONSTRAINT "user_roles_pkey" PRIMARY KEY ("id");



CREATE INDEX "idx_audit_logs_created_at" ON "public"."audit_logs" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_audit_logs_table_action" ON "public"."audit_logs" USING "btree" ("table_name", "action");



CREATE INDEX "idx_audit_logs_table_record" ON "public"."audit_logs" USING "btree" ("table_name", "record_id");



CREATE INDEX "idx_audit_logs_user_id" ON "public"."audit_logs" USING "btree" ("user_id");



CREATE INDEX "idx_companies_active" ON "public"."companies" USING "btree" ("is_active");



CREATE INDEX "idx_companies_name" ON "public"."companies" USING "btree" ("name");



CREATE INDEX "idx_companies_oib" ON "public"."companies" USING "btree" ("oib");



CREATE INDEX "idx_daily_guest_services_date" ON "public"."daily_guest_services" USING "btree" ("service_date");



CREATE INDEX "idx_daily_guest_services_stay_id" ON "public"."daily_guest_services" USING "btree" ("guest_stay_id");



CREATE INDEX "idx_fiscal_records_invoice" ON "public"."fiscal_records" USING "btree" ("invoice_id");



CREATE INDEX "idx_guest_children_reservation" ON "public"."guest_children" USING "btree" ("reservation_id");



CREATE INDEX "idx_guest_stays_dates" ON "public"."guest_stays" USING "btree" ("check_in", "check_out");



CREATE INDEX "idx_guest_stays_guest_id" ON "public"."guest_stays" USING "btree" ("guest_id");



CREATE INDEX "idx_guest_stays_reservation_id" ON "public"."guest_stays" USING "btree" ("reservation_id");



CREATE INDEX "idx_guests_phobs_id" ON "public"."guests" USING "btree" ("phobs_guest_id");



CREATE INDEX "idx_inventory_dashboard_stats" ON "public"."inventory" USING "btree" ("quantity", "expiration_date") WHERE ("expiration_date" IS NOT NULL);



CREATE INDEX "idx_inventory_expiration_date" ON "public"."inventory" USING "btree" ("expiration_date") WHERE ("expiration_date" IS NOT NULL);



CREATE INDEX "idx_inventory_item_id" ON "public"."inventory" USING "btree" ("item_id");



CREATE INDEX "idx_inventory_location_display_order" ON "public"."inventory" USING "btree" ("location_id", "display_order");



CREATE INDEX "idx_inventory_location_id" ON "public"."inventory" USING "btree" ("location_id");



CREATE INDEX "idx_inventory_quantity_min_stock" ON "public"."inventory" USING "btree" ("quantity");



CREATE INDEX "idx_invoices_company" ON "public"."invoices" USING "btree" ("company_id");



CREATE INDEX "idx_invoices_guest" ON "public"."invoices" USING "btree" ("guest_id");



CREATE INDEX "idx_invoices_reservation" ON "public"."invoices" USING "btree" ("reservation_id");



CREATE INDEX "idx_invoices_status" ON "public"."invoices" USING "btree" ("status");



CREATE INDEX "idx_items_category_id" ON "public"."items" USING "btree" ("category_id");



CREATE INDEX "idx_items_minimum_stock" ON "public"."items" USING "btree" ("minimum_stock");



CREATE INDEX "idx_payments_invoice" ON "public"."payments" USING "btree" ("invoice_id");



CREATE INDEX "idx_payments_invoice_id" ON "public"."payments" USING "btree" ("invoice_id");



CREATE INDEX "idx_payments_payment_method" ON "public"."payments" USING "btree" ("payment_method");



CREATE INDEX "idx_payments_received_date" ON "public"."payments" USING "btree" ("received_date");



CREATE INDEX "idx_payments_status" ON "public"."payments" USING "btree" ("status");



CREATE INDEX "idx_phobs_availability_date" ON "public"."phobs_availability" USING "btree" ("date");



CREATE INDEX "idx_phobs_availability_room" ON "public"."phobs_availability" USING "btree" ("room_mapping_id");



CREATE INDEX "idx_phobs_conflicts_severity" ON "public"."phobs_conflicts" USING "btree" ("severity");



CREATE INDEX "idx_phobs_conflicts_status" ON "public"."phobs_conflicts" USING "btree" ("status");



CREATE INDEX "idx_phobs_conflicts_type" ON "public"."phobs_conflicts" USING "btree" ("conflict_type");



CREATE INDEX "idx_phobs_sync_log_operation" ON "public"."phobs_sync_log" USING "btree" ("operation");



CREATE INDEX "idx_phobs_sync_log_started" ON "public"."phobs_sync_log" USING "btree" ("started_at");



CREATE INDEX "idx_phobs_sync_log_status" ON "public"."phobs_sync_log" USING "btree" ("status");



CREATE INDEX "idx_phobs_webhook_events_status" ON "public"."phobs_webhook_events" USING "btree" ("status");



CREATE INDEX "idx_phobs_webhook_events_timestamp" ON "public"."phobs_webhook_events" USING "btree" ("timestamp");



CREATE INDEX "idx_phobs_webhook_events_type" ON "public"."phobs_webhook_events" USING "btree" ("event_type");



CREATE INDEX "idx_pricing_tiers_active" ON "public"."pricing_tiers" USING "btree" ("is_active");



CREATE INDEX "idx_pricing_tiers_default" ON "public"."pricing_tiers" USING "btree" ("is_default");



CREATE INDEX "idx_reservation_daily_details_lookup" ON "public"."reservation_daily_details" USING "btree" ("reservation_id", "stay_date");



CREATE INDEX "idx_reservation_daily_details_reservation_id" ON "public"."reservation_daily_details" USING "btree" ("reservation_id");



CREATE INDEX "idx_reservation_daily_details_stay_date" ON "public"."reservation_daily_details" USING "btree" ("stay_date");



CREATE INDEX "idx_reservation_guests_guest_id" ON "public"."reservation_guests" USING "btree" ("guest_id");



CREATE INDEX "idx_reservation_guests_reservation_id" ON "public"."reservation_guests" USING "btree" ("reservation_id");



CREATE INDEX "idx_reservations_booking_date" ON "public"."reservations" USING "btree" ("booking_date");



CREATE INDEX "idx_reservations_booking_ref" ON "public"."reservations" USING "btree" ("booking_reference");



CREATE INDEX "idx_reservations_booking_source_id" ON "public"."reservations" USING "btree" ("booking_source_id");



CREATE INDEX "idx_reservations_company" ON "public"."reservations" USING "btree" ("company_id");



CREATE INDEX "idx_reservations_confirmation" ON "public"."reservations" USING "btree" ("confirmation_number");



CREATE INDEX "idx_reservations_dates" ON "public"."reservations" USING "btree" ("check_in_date", "check_out_date");



CREATE INDEX "idx_reservations_guest_id" ON "public"."reservations" USING "btree" ("guest_id");



CREATE INDEX "idx_reservations_ota_channel" ON "public"."reservations" USING "btree" ("ota_channel");



CREATE INDEX "idx_reservations_phobs_id" ON "public"."reservations" USING "btree" ("phobs_reservation_id");



CREATE INDEX "idx_reservations_pricing_tier" ON "public"."reservations" USING "btree" ("pricing_tier_id");



CREATE INDEX "idx_reservations_room_id" ON "public"."reservations" USING "btree" ("room_id");



CREATE INDEX "idx_reservations_status" ON "public"."reservations" USING "btree" ("status");



CREATE INDEX "idx_reservations_status_id" ON "public"."reservations" USING "btree" ("status_id");



CREATE INDEX "idx_reservations_sync_status" ON "public"."reservations" USING "btree" ("sync_status");



CREATE INDEX "idx_room_service_reservation" ON "public"."room_service_orders" USING "btree" ("reservation_id");



CREATE INDEX "idx_rooms_number" ON "public"."rooms" USING "btree" ("room_number");



CREATE INDEX "idx_rooms_room_type_id" ON "public"."rooms" USING "btree" ("room_type_id");



CREATE INDEX "idx_rooms_type" ON "public"."rooms" USING "btree" ("room_type");



CREATE INDEX "idx_user_profiles_role_id" ON "public"."user_profiles" USING "btree" ("role_id");



CREATE INDEX "idx_user_profiles_user_id" ON "public"."user_profiles" USING "btree" ("user_id");



CREATE OR REPLACE VIEW "public"."reservation_with_all_guests" AS
 SELECT "r"."id",
    "r"."guest_id",
    "r"."room_id",
    "r"."check_in_date",
    "r"."check_out_date",
    "r"."number_of_nights",
    "r"."number_of_guests",
    "r"."adults",
    "r"."children_count",
    "r"."status",
    "r"."booking_source",
    "r"."special_requests",
    "r"."internal_notes",
    "r"."seasonal_period",
    "r"."base_room_rate",
    "r"."subtotal",
    "r"."children_discounts",
    "r"."tourism_tax",
    "r"."vat_amount",
    "r"."pet_fee",
    "r"."parking_fee",
    "r"."short_stay_supplement",
    "r"."additional_charges",
    "r"."total_amount",
    "r"."payment_status",
    "r"."payment_method",
    "r"."deposit_amount",
    "r"."balance_due",
    "r"."booking_date",
    "r"."confirmation_number",
    "r"."created_at",
    "r"."updated_at",
    "r"."company_id",
    "r"."pricing_tier_id",
    "r"."has_pets",
    "r"."parking_required",
    "r"."last_modified",
    "r"."checked_in_at",
    "r"."checked_out_at",
    "r"."phobs_reservation_id",
    "r"."booking_reference",
    "r"."ota_channel",
    "r"."commission_rate",
    "r"."commission_amount",
    "r"."net_amount",
    "r"."sync_status",
    "r"."sync_errors",
    "r"."last_synced_at",
    COALESCE("json_agg"("json_build_object"('id', "g"."id", 'first_name', "g"."first_name", 'last_name', "g"."last_name", 'email', "g"."email", 'phone', "g"."phone", 'is_primary', ("g"."id" = "r"."guest_id"), 'check_in', COALESCE("gs"."check_in", ("r"."check_in_date")::timestamp with time zone), 'check_out', COALESCE("gs"."check_out", ("r"."check_out_date")::timestamp with time zone))) FILTER (WHERE ("g"."id" IS NOT NULL)), '[]'::json) AS "all_guests"
   FROM ((("public"."reservations" "r"
     LEFT JOIN "public"."reservation_guests" "rg" ON (("r"."id" = "rg"."reservation_id")))
     LEFT JOIN "public"."guests" "g" ON (("rg"."guest_id" = "g"."id")))
     LEFT JOIN "public"."guest_stays" "gs" ON ((("r"."id" = "gs"."reservation_id") AND ("g"."id" = "gs"."guest_id"))))
  GROUP BY "r"."id";



CREATE OR REPLACE TRIGGER "audit_categories_trigger" AFTER INSERT OR DELETE OR UPDATE ON "public"."categories" FOR EACH ROW EXECUTE FUNCTION "public"."audit_trigger_function"();



CREATE OR REPLACE TRIGGER "audit_inventory_trigger" AFTER INSERT OR DELETE OR UPDATE ON "public"."inventory" FOR EACH ROW EXECUTE FUNCTION "public"."audit_trigger_function"();



CREATE OR REPLACE TRIGGER "audit_items_trigger" AFTER INSERT OR DELETE OR UPDATE ON "public"."items" FOR EACH ROW EXECUTE FUNCTION "public"."audit_trigger_function"();



CREATE OR REPLACE TRIGGER "audit_locations_trigger" AFTER INSERT OR DELETE OR UPDATE ON "public"."locations" FOR EACH ROW EXECUTE FUNCTION "public"."audit_trigger_function"();



CREATE OR REPLACE TRIGGER "audit_user_profiles_trigger" AFTER INSERT OR DELETE OR UPDATE ON "public"."user_profiles" FOR EACH ROW EXECUTE FUNCTION "public"."audit_trigger_function"();



CREATE OR REPLACE TRIGGER "companies_updated_at" BEFORE UPDATE ON "public"."companies" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "guests_updated_at" BEFORE UPDATE ON "public"."guests" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "invoices_updated_at" BEFORE UPDATE ON "public"."invoices" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "pricing_tiers_updated_at" BEFORE UPDATE ON "public"."pricing_tiers" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "trigger_auto_normalize_reservation" AFTER INSERT ON "public"."reservations" FOR EACH ROW EXECUTE FUNCTION "public"."auto_normalize_reservation"();



CREATE OR REPLACE TRIGGER "trigger_auto_update_reservation_enums" AFTER UPDATE ON "public"."reservations" FOR EACH ROW EXECUTE FUNCTION "public"."auto_update_reservation_enums"();



CREATE OR REPLACE TRIGGER "update_daily_guest_services_updated_at" BEFORE UPDATE ON "public"."daily_guest_services" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_guest_stays_updated_at" BEFORE UPDATE ON "public"."guest_stays" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_guests_updated_at" BEFORE UPDATE ON "public"."guests" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_inventory_updated_at" BEFORE UPDATE ON "public"."inventory" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_items_updated_at" BEFORE UPDATE ON "public"."items" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_reservation_daily_details_updated_at" BEFORE UPDATE ON "public"."reservation_daily_details" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_reservation_guests_updated_at" BEFORE UPDATE ON "public"."reservation_guests" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_reservations_updated_at" BEFORE UPDATE ON "public"."reservations" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_rooms_updated_at" BEFORE UPDATE ON "public"."rooms" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_user_profiles_updated_at" BEFORE UPDATE ON "public"."user_profiles" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



ALTER TABLE ONLY "public"."audit_logs"
    ADD CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."companies"
    ADD CONSTRAINT "companies_pricing_tier_fkey" FOREIGN KEY ("pricing_tier_id") REFERENCES "public"."pricing_tiers"("id");



ALTER TABLE ONLY "public"."daily_guest_services"
    ADD CONSTRAINT "daily_guest_services_guest_stay_id_fkey" FOREIGN KEY ("guest_stay_id") REFERENCES "public"."guest_stays"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."fiscal_records"
    ADD CONSTRAINT "fiscal_records_invoice_fkey" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id");



ALTER TABLE ONLY "public"."guest_children"
    ADD CONSTRAINT "guest_children_guest_fkey" FOREIGN KEY ("guest_id") REFERENCES "public"."guests"("id");



ALTER TABLE ONLY "public"."guest_children"
    ADD CONSTRAINT "guest_children_reservation_fk" FOREIGN KEY ("reservation_id") REFERENCES "public"."reservations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."guest_stays"
    ADD CONSTRAINT "guest_stays_guest_id_fkey" FOREIGN KEY ("guest_id") REFERENCES "public"."guests"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."guest_stays"
    ADD CONSTRAINT "guest_stays_reservation_id_fkey" FOREIGN KEY ("reservation_id") REFERENCES "public"."reservations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."inventory"
    ADD CONSTRAINT "inventory_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "public"."items"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."inventory"
    ADD CONSTRAINT "inventory_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id");



ALTER TABLE ONLY "public"."invoices"
    ADD CONSTRAINT "invoices_company_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id");



ALTER TABLE ONLY "public"."invoices"
    ADD CONSTRAINT "invoices_guest_fkey" FOREIGN KEY ("guest_id") REFERENCES "public"."guests"("id");



ALTER TABLE ONLY "public"."invoices"
    ADD CONSTRAINT "invoices_reservation_fkey" FOREIGN KEY ("reservation_id") REFERENCES "public"."reservations"("id");



ALTER TABLE ONLY "public"."items"
    ADD CONSTRAINT "items_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id");



ALTER TABLE ONLY "public"."payments"
    ADD CONSTRAINT "payments_invoice_fkey" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id");



ALTER TABLE ONLY "public"."payments"
    ADD CONSTRAINT "payments_reservation_fkey" FOREIGN KEY ("reservation_id") REFERENCES "public"."reservations"("id");



ALTER TABLE ONLY "public"."phobs_availability"
    ADD CONSTRAINT "phobs_availability_rate_plan_id_fkey" FOREIGN KEY ("rate_plan_id") REFERENCES "public"."phobs_rate_plans"("id");



ALTER TABLE ONLY "public"."phobs_availability"
    ADD CONSTRAINT "phobs_availability_room_mapping_id_fkey" FOREIGN KEY ("room_mapping_id") REFERENCES "public"."phobs_room_mappings"("id");



ALTER TABLE ONLY "public"."phobs_room_mappings"
    ADD CONSTRAINT "phobs_room_mappings_internal_room_id_fkey" FOREIGN KEY ("internal_room_id") REFERENCES "public"."rooms"("id");



ALTER TABLE ONLY "public"."reservation_daily_details"
    ADD CONSTRAINT "reservation_daily_details_reservation_id_fkey" FOREIGN KEY ("reservation_id") REFERENCES "public"."reservations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."reservation_guests"
    ADD CONSTRAINT "reservation_guests_guest_id_fkey" FOREIGN KEY ("guest_id") REFERENCES "public"."guests"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."reservation_guests"
    ADD CONSTRAINT "reservation_guests_reservation_id_fkey" FOREIGN KEY ("reservation_id") REFERENCES "public"."reservations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."reservations"
    ADD CONSTRAINT "reservations_booking_source_id_fkey" FOREIGN KEY ("booking_source_id") REFERENCES "public"."booking_sources"("id");



ALTER TABLE ONLY "public"."reservations"
    ADD CONSTRAINT "reservations_company_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id");



ALTER TABLE ONLY "public"."reservations"
    ADD CONSTRAINT "reservations_guest_id_fkey" FOREIGN KEY ("guest_id") REFERENCES "public"."guests"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."reservations"
    ADD CONSTRAINT "reservations_pricing_tier_fkey" FOREIGN KEY ("pricing_tier_id") REFERENCES "public"."pricing_tiers"("id");



ALTER TABLE ONLY "public"."reservations"
    ADD CONSTRAINT "reservations_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "public"."rooms"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."reservations"
    ADD CONSTRAINT "reservations_status_id_fkey" FOREIGN KEY ("status_id") REFERENCES "public"."reservation_statuses"("id");



ALTER TABLE ONLY "public"."room_pricing"
    ADD CONSTRAINT "room_pricing_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "public"."rooms"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."room_pricing"
    ADD CONSTRAINT "room_pricing_season_id_fkey" FOREIGN KEY ("season_id") REFERENCES "public"."pricing_seasons"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."room_service_orders"
    ADD CONSTRAINT "room_service_reservation_fk" FOREIGN KEY ("reservation_id") REFERENCES "public"."reservations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."rooms"
    ADD CONSTRAINT "rooms_room_type_id_fkey" FOREIGN KEY ("room_type_id") REFERENCES "public"."room_types"("id");



ALTER TABLE ONLY "public"."user_profiles"
    ADD CONSTRAINT "user_profiles_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "public"."user_roles"("id");



ALTER TABLE ONLY "public"."user_profiles"
    ADD CONSTRAINT "user_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



CREATE POLICY "Admins can view all audit logs" ON "public"."audit_logs" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ("public"."user_profiles" "up"
     JOIN "public"."user_roles" "ur" ON (("up"."role_id" = "ur"."id")))
  WHERE (("up"."user_id" = "auth"."uid"()) AND (("ur"."name")::"text" = 'admin'::"text")))));



CREATE POLICY "Allow all operations on companies" ON "public"."companies" TO "authenticated", "anon" USING (true) WITH CHECK (true);



CREATE POLICY "Allow all operations on fiscal_records" ON "public"."fiscal_records" TO "authenticated", "anon" USING (true) WITH CHECK (true);



CREATE POLICY "Allow all operations on invoices" ON "public"."invoices" TO "authenticated", "anon" USING (true) WITH CHECK (true);



CREATE POLICY "Allow all operations on payments" ON "public"."payments" TO "authenticated", "anon" USING (true) WITH CHECK (true);



CREATE POLICY "Allow all operations on pricing_tiers" ON "public"."pricing_tiers" TO "authenticated", "anon" USING (true) WITH CHECK (true);



CREATE POLICY "Authenticated users can view user roles" ON "public"."user_roles" FOR SELECT USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Enable all operations for authenticated users" ON "public"."categories" USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Enable all operations for authenticated users" ON "public"."daily_guest_services" TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "Enable all operations for authenticated users" ON "public"."guest_children" USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Enable all operations for authenticated users" ON "public"."guest_stays" TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "Enable all operations for authenticated users" ON "public"."guests" USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Enable all operations for authenticated users" ON "public"."inventory" USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Enable all operations for authenticated users" ON "public"."items" USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Enable all operations for authenticated users" ON "public"."locations" USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Enable all operations for authenticated users" ON "public"."reservation_guests" TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "Enable all operations for authenticated users" ON "public"."reservations" USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Enable all operations for authenticated users" ON "public"."room_service_orders" USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Enable all operations for authenticated users" ON "public"."rooms" USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Enable insert for users" ON "public"."user_profiles" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Enable read for users" ON "public"."user_profiles" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Enable update for users" ON "public"."user_profiles" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own audit logs" ON "public"."audit_logs" FOR SELECT TO "authenticated" USING (("user_id" = "auth"."uid"()));



ALTER TABLE "public"."audit_logs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."categories" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."companies" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."daily_guest_services" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."fiscal_records" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."guest_children" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."guest_stays" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."guests" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."inventory" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."invoices" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."items" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."locations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."payments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."pricing_tiers" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."reservation_guests" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."reservations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."room_service_orders" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."rooms" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_profiles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_roles" ENABLE ROW LEVEL SECURITY;


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";



GRANT ALL ON FUNCTION "public"."audit_trigger_function"() TO "anon";
GRANT ALL ON FUNCTION "public"."audit_trigger_function"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."audit_trigger_function"() TO "service_role";



GRANT ALL ON FUNCTION "public"."auto_normalize_reservation"() TO "anon";
GRANT ALL ON FUNCTION "public"."auto_normalize_reservation"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."auto_normalize_reservation"() TO "service_role";



GRANT ALL ON FUNCTION "public"."auto_update_reservation_enums"() TO "anon";
GRANT ALL ON FUNCTION "public"."auto_update_reservation_enums"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."auto_update_reservation_enums"() TO "service_role";



GRANT ALL ON FUNCTION "public"."calculate_child_age"() TO "anon";
GRANT ALL ON FUNCTION "public"."calculate_child_age"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."calculate_child_age"() TO "service_role";



GRANT ALL ON FUNCTION "public"."calculate_line_item_totals"() TO "anon";
GRANT ALL ON FUNCTION "public"."calculate_line_item_totals"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."calculate_line_item_totals"() TO "service_role";



GRANT ALL ON FUNCTION "public"."calculate_payment_amounts"() TO "anon";
GRANT ALL ON FUNCTION "public"."calculate_payment_amounts"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."calculate_payment_amounts"() TO "service_role";



GRANT ALL ON FUNCTION "public"."check_tables_exist"("table_names" "text"[]) TO "anon";
GRANT ALL ON FUNCTION "public"."check_tables_exist"("table_names" "text"[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_tables_exist"("table_names" "text"[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_room_price"("p_room_id" integer, "p_date" "date") TO "anon";
GRANT ALL ON FUNCTION "public"."get_room_price"("p_room_id" integer, "p_date" "date") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_room_price"("p_room_id" integer, "p_date" "date") TO "service_role";



GRANT ALL ON FUNCTION "public"."log_audit_entry"("p_user_id" "uuid", "p_action" "text", "p_table_name" "text", "p_record_id" integer, "p_description" "text", "p_old_values" "jsonb", "p_new_values" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."log_audit_entry"("p_user_id" "uuid", "p_action" "text", "p_table_name" "text", "p_record_id" integer, "p_description" "text", "p_old_values" "jsonb", "p_new_values" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."log_audit_entry"("p_user_id" "uuid", "p_action" "text", "p_table_name" "text", "p_record_id" integer, "p_description" "text", "p_old_values" "jsonb", "p_new_values" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."log_inventory_quantity_update"("p_inventory_id" integer, "p_item_name" "text", "p_old_quantity" integer, "p_new_quantity" integer, "p_location_name" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."log_inventory_quantity_update"("p_inventory_id" integer, "p_item_name" "text", "p_old_quantity" integer, "p_new_quantity" integer, "p_location_name" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."log_inventory_quantity_update"("p_inventory_id" integer, "p_item_name" "text", "p_old_quantity" integer, "p_new_quantity" integer, "p_location_name" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."migrate_all_reservations_to_daily_details"() TO "anon";
GRANT ALL ON FUNCTION "public"."migrate_all_reservations_to_daily_details"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."migrate_all_reservations_to_daily_details"() TO "service_role";



GRANT ALL ON FUNCTION "public"."migrate_enumeration_data"() TO "anon";
GRANT ALL ON FUNCTION "public"."migrate_enumeration_data"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."migrate_enumeration_data"() TO "service_role";



GRANT ALL ON FUNCTION "public"."migrate_reservation_guests"() TO "anon";
GRANT ALL ON FUNCTION "public"."migrate_reservation_guests"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."migrate_reservation_guests"() TO "service_role";



GRANT ALL ON FUNCTION "public"."migrate_reservation_to_daily_details"("p_reservation_id" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."migrate_reservation_to_daily_details"("p_reservation_id" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."migrate_reservation_to_daily_details"("p_reservation_id" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."reset_daily_room_cleaning"() TO "anon";
GRANT ALL ON FUNCTION "public"."reset_daily_room_cleaning"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."reset_daily_room_cleaning"() TO "service_role";



GRANT ALL ON FUNCTION "public"."reset_daily_room_cleaning"("trigger_source" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."reset_daily_room_cleaning"("trigger_source" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."reset_daily_room_cleaning"("trigger_source" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."set_current_user_for_audit"("user_uuid" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."set_current_user_for_audit"("user_uuid" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_current_user_for_audit"("user_uuid" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "service_role";



GRANT ALL ON FUNCTION "public"."validate_room_401_booking"() TO "anon";
GRANT ALL ON FUNCTION "public"."validate_room_401_booking"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."validate_room_401_booking"() TO "service_role";



GRANT ALL ON TABLE "public"."audit_logs" TO "anon";
GRANT ALL ON TABLE "public"."audit_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."audit_logs" TO "service_role";



GRANT ALL ON SEQUENCE "public"."audit_logs_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."audit_logs_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."audit_logs_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."booking_sources" TO "anon";
GRANT ALL ON TABLE "public"."booking_sources" TO "authenticated";
GRANT ALL ON TABLE "public"."booking_sources" TO "service_role";



GRANT ALL ON SEQUENCE "public"."booking_sources_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."booking_sources_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."booking_sources_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."categories" TO "anon";
GRANT ALL ON TABLE "public"."categories" TO "authenticated";
GRANT ALL ON TABLE "public"."categories" TO "service_role";



GRANT ALL ON SEQUENCE "public"."categories_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."categories_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."categories_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."companies" TO "anon";
GRANT ALL ON TABLE "public"."companies" TO "authenticated";
GRANT ALL ON TABLE "public"."companies" TO "service_role";



GRANT ALL ON SEQUENCE "public"."companies_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."companies_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."companies_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."daily_guest_services" TO "anon";
GRANT ALL ON TABLE "public"."daily_guest_services" TO "authenticated";
GRANT ALL ON TABLE "public"."daily_guest_services" TO "service_role";



GRANT ALL ON SEQUENCE "public"."daily_guest_services_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."daily_guest_services_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."daily_guest_services_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."fiscal_records" TO "anon";
GRANT ALL ON TABLE "public"."fiscal_records" TO "authenticated";
GRANT ALL ON TABLE "public"."fiscal_records" TO "service_role";



GRANT ALL ON SEQUENCE "public"."fiscal_records_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."fiscal_records_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."fiscal_records_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."guest_children" TO "anon";
GRANT ALL ON TABLE "public"."guest_children" TO "authenticated";
GRANT ALL ON TABLE "public"."guest_children" TO "service_role";



GRANT ALL ON SEQUENCE "public"."guest_children_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."guest_children_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."guest_children_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."guest_stays" TO "anon";
GRANT ALL ON TABLE "public"."guest_stays" TO "authenticated";
GRANT ALL ON TABLE "public"."guest_stays" TO "service_role";



GRANT ALL ON SEQUENCE "public"."guest_stays_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."guest_stays_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."guest_stays_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."guests" TO "anon";
GRANT ALL ON TABLE "public"."guests" TO "authenticated";
GRANT ALL ON TABLE "public"."guests" TO "service_role";



GRANT ALL ON SEQUENCE "public"."guests_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."guests_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."guests_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."hotels" TO "anon";
GRANT ALL ON TABLE "public"."hotels" TO "authenticated";
GRANT ALL ON TABLE "public"."hotels" TO "service_role";



GRANT ALL ON SEQUENCE "public"."hotels_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."hotels_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."hotels_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."inventory" TO "anon";
GRANT ALL ON TABLE "public"."inventory" TO "authenticated";
GRANT ALL ON TABLE "public"."inventory" TO "service_role";



GRANT ALL ON SEQUENCE "public"."inventory_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."inventory_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."inventory_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."invoices" TO "anon";
GRANT ALL ON TABLE "public"."invoices" TO "authenticated";
GRANT ALL ON TABLE "public"."invoices" TO "service_role";



GRANT ALL ON SEQUENCE "public"."invoices_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."invoices_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."invoices_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."items" TO "anon";
GRANT ALL ON TABLE "public"."items" TO "authenticated";
GRANT ALL ON TABLE "public"."items" TO "service_role";



GRANT ALL ON SEQUENCE "public"."items_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."items_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."items_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."locations" TO "anon";
GRANT ALL ON TABLE "public"."locations" TO "authenticated";
GRANT ALL ON TABLE "public"."locations" TO "service_role";



GRANT ALL ON SEQUENCE "public"."locations_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."locations_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."locations_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."payments" TO "anon";
GRANT ALL ON TABLE "public"."payments" TO "authenticated";
GRANT ALL ON TABLE "public"."payments" TO "service_role";



GRANT ALL ON SEQUENCE "public"."payments_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."payments_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."payments_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."phobs_availability" TO "anon";
GRANT ALL ON TABLE "public"."phobs_availability" TO "authenticated";
GRANT ALL ON TABLE "public"."phobs_availability" TO "service_role";



GRANT ALL ON SEQUENCE "public"."phobs_availability_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."phobs_availability_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."phobs_availability_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."phobs_channel_metrics" TO "anon";
GRANT ALL ON TABLE "public"."phobs_channel_metrics" TO "authenticated";
GRANT ALL ON TABLE "public"."phobs_channel_metrics" TO "service_role";



GRANT ALL ON SEQUENCE "public"."phobs_channel_metrics_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."phobs_channel_metrics_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."phobs_channel_metrics_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."phobs_channel_status" TO "anon";
GRANT ALL ON TABLE "public"."phobs_channel_status" TO "authenticated";
GRANT ALL ON TABLE "public"."phobs_channel_status" TO "service_role";



GRANT ALL ON TABLE "public"."phobs_channels" TO "anon";
GRANT ALL ON TABLE "public"."phobs_channels" TO "authenticated";
GRANT ALL ON TABLE "public"."phobs_channels" TO "service_role";



GRANT ALL ON SEQUENCE "public"."phobs_channels_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."phobs_channels_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."phobs_channels_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."phobs_conflicts" TO "anon";
GRANT ALL ON TABLE "public"."phobs_conflicts" TO "authenticated";
GRANT ALL ON TABLE "public"."phobs_conflicts" TO "service_role";



GRANT ALL ON SEQUENCE "public"."phobs_conflicts_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."phobs_conflicts_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."phobs_conflicts_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."phobs_rate_plans" TO "anon";
GRANT ALL ON TABLE "public"."phobs_rate_plans" TO "authenticated";
GRANT ALL ON TABLE "public"."phobs_rate_plans" TO "service_role";



GRANT ALL ON SEQUENCE "public"."phobs_rate_plans_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."phobs_rate_plans_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."phobs_rate_plans_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."phobs_room_mappings" TO "anon";
GRANT ALL ON TABLE "public"."phobs_room_mappings" TO "authenticated";
GRANT ALL ON TABLE "public"."phobs_room_mappings" TO "service_role";



GRANT ALL ON SEQUENCE "public"."phobs_room_mappings_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."phobs_room_mappings_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."phobs_room_mappings_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."phobs_sync_log" TO "anon";
GRANT ALL ON TABLE "public"."phobs_sync_log" TO "authenticated";
GRANT ALL ON TABLE "public"."phobs_sync_log" TO "service_role";



GRANT ALL ON SEQUENCE "public"."phobs_sync_log_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."phobs_sync_log_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."phobs_sync_log_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."phobs_webhook_events" TO "anon";
GRANT ALL ON TABLE "public"."phobs_webhook_events" TO "authenticated";
GRANT ALL ON TABLE "public"."phobs_webhook_events" TO "service_role";



GRANT ALL ON SEQUENCE "public"."phobs_webhook_events_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."phobs_webhook_events_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."phobs_webhook_events_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."pricing_seasons" TO "anon";
GRANT ALL ON TABLE "public"."pricing_seasons" TO "authenticated";
GRANT ALL ON TABLE "public"."pricing_seasons" TO "service_role";



GRANT ALL ON SEQUENCE "public"."pricing_seasons_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."pricing_seasons_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."pricing_seasons_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."pricing_tiers" TO "anon";
GRANT ALL ON TABLE "public"."pricing_tiers" TO "authenticated";
GRANT ALL ON TABLE "public"."pricing_tiers" TO "service_role";



GRANT ALL ON SEQUENCE "public"."pricing_tiers_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."pricing_tiers_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."pricing_tiers_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."reservation_daily_details" TO "anon";
GRANT ALL ON TABLE "public"."reservation_daily_details" TO "authenticated";
GRANT ALL ON TABLE "public"."reservation_daily_details" TO "service_role";



GRANT ALL ON SEQUENCE "public"."reservation_daily_details_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."reservation_daily_details_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."reservation_daily_details_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."reservation_guests" TO "anon";
GRANT ALL ON TABLE "public"."reservation_guests" TO "authenticated";
GRANT ALL ON TABLE "public"."reservation_guests" TO "service_role";



GRANT ALL ON SEQUENCE "public"."reservation_guests_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."reservation_guests_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."reservation_guests_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."reservation_statuses" TO "anon";
GRANT ALL ON TABLE "public"."reservation_statuses" TO "authenticated";
GRANT ALL ON TABLE "public"."reservation_statuses" TO "service_role";



GRANT ALL ON SEQUENCE "public"."reservation_statuses_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."reservation_statuses_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."reservation_statuses_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."reservation_with_all_guests" TO "anon";
GRANT ALL ON TABLE "public"."reservation_with_all_guests" TO "authenticated";
GRANT ALL ON TABLE "public"."reservation_with_all_guests" TO "service_role";



GRANT ALL ON TABLE "public"."reservations" TO "anon";
GRANT ALL ON TABLE "public"."reservations" TO "authenticated";
GRANT ALL ON TABLE "public"."reservations" TO "service_role";



GRANT ALL ON SEQUENCE "public"."reservations_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."reservations_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."reservations_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."reservations_with_enums" TO "anon";
GRANT ALL ON TABLE "public"."reservations_with_enums" TO "authenticated";
GRANT ALL ON TABLE "public"."reservations_with_enums" TO "service_role";



GRANT ALL ON TABLE "public"."room_cleaning_reset_log" TO "anon";
GRANT ALL ON TABLE "public"."room_cleaning_reset_log" TO "authenticated";
GRANT ALL ON TABLE "public"."room_cleaning_reset_log" TO "service_role";



GRANT ALL ON SEQUENCE "public"."room_cleaning_reset_log_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."room_cleaning_reset_log_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."room_cleaning_reset_log_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."room_pricing" TO "anon";
GRANT ALL ON TABLE "public"."room_pricing" TO "authenticated";
GRANT ALL ON TABLE "public"."room_pricing" TO "service_role";



GRANT ALL ON SEQUENCE "public"."room_pricing_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."room_pricing_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."room_pricing_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."room_service_orders" TO "anon";
GRANT ALL ON TABLE "public"."room_service_orders" TO "authenticated";
GRANT ALL ON TABLE "public"."room_service_orders" TO "service_role";



GRANT ALL ON SEQUENCE "public"."room_service_orders_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."room_service_orders_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."room_service_orders_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."room_types" TO "anon";
GRANT ALL ON TABLE "public"."room_types" TO "authenticated";
GRANT ALL ON TABLE "public"."room_types" TO "service_role";



GRANT ALL ON SEQUENCE "public"."room_types_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."room_types_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."room_types_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."rooms" TO "anon";
GRANT ALL ON TABLE "public"."rooms" TO "authenticated";
GRANT ALL ON TABLE "public"."rooms" TO "service_role";



GRANT ALL ON SEQUENCE "public"."rooms_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."rooms_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."rooms_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."rooms_with_enums" TO "anon";
GRANT ALL ON TABLE "public"."rooms_with_enums" TO "authenticated";
GRANT ALL ON TABLE "public"."rooms_with_enums" TO "service_role";



GRANT ALL ON TABLE "public"."user_profiles" TO "anon";
GRANT ALL ON TABLE "public"."user_profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."user_profiles" TO "service_role";



GRANT ALL ON TABLE "public"."user_roles" TO "anon";
GRANT ALL ON TABLE "public"."user_roles" TO "authenticated";
GRANT ALL ON TABLE "public"."user_roles" TO "service_role";



GRANT ALL ON SEQUENCE "public"."user_roles_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."user_roles_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."user_roles_id_seq" TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";







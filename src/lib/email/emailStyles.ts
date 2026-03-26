/**
 * Shared HTML/CSS styles for Hotel Porec email templates.
 * Pure function — no side effects.
 */
export function getEmailStyles(): string {
  return `
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            background-color: #f8fafc;
            background-image: url('https://gkbpthurkucotikjefra.supabase.co/storage/v1/object/public/hotel-assets/mozaik_gp1_copy.png');
            background-repeat: no-repeat;
            background-position: bottom right;
            background-size: 300px;
            background-attachment: fixed;
        }
        .container {
            background: rgba(255, 255, 255, 0.95);
            margin: 20px;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        }
        .header {
            background: white;
            color: #1F2937;
            padding: 30px 25px;
            text-align: center;
            position: relative;
            border-bottom: 3px solid #3B82F6;
        }
        .logo {
            max-width: 200px;
            height: auto;
            margin-bottom: 15px;
        }
        .header h1 {
            margin: 0;
            font-size: 28px;
            font-weight: 300;
        }
        .content {
            padding: 30px 25px;
        }
        .section {
            margin-bottom: 30px;
            padding: 20px;
            background: rgba(248, 250, 252, 0.8);
            border-radius: 8px;
            border-left: 4px solid #3B82F6;
        }
        .section h3 {
            color: #1E40AF;
            margin-top: 0;
            font-size: 18px;
            display: flex;
            align-items: center;
        }
        .booking-details {
            background: rgba(239, 246, 255, 0.9);
            border-left-color: #3B82F6;
        }
        .important-info {
            background: rgba(254, 243, 199, 0.9);
            border-left-color: #F59E0B;
        }
        .amenities {
            background: rgba(236, 253, 245, 0.9);
            border-left-color: #10B981;
        }
        .contact {
            background: rgba(243, 232, 255, 0.9);
            border-left-color: #8B5CF6;
        }
        .info-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 15px;
            margin: 15px 0;
        }
        .info-item {
            padding: 12px;
            background: rgba(255, 255, 255, 0.9);
            border-radius: 6px;
            border: 1px solid #E5E7EB;
        }
        .info-label {
            font-weight: 600;
            color: #6B7280;
            font-size: 12px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        .info-value {
            font-size: 16px;
            color: #1F2937;
            margin-top: 4px;
        }
        .highlight {
            background: rgba(254, 226, 226, 0.9);
            color: #DC2626;
            padding: 15px;
            border-radius: 6px;
            font-weight: 500;
            margin: 15px 0;
        }
        .footer {
            background: rgba(249, 250, 251, 0.95);
            padding: 25px;
            text-align: center;
            color: #6B7280;
            font-size: 14px;
            border-top: 1px solid #E5E7EB;
        }
        .cta-button {
            display: inline-block;
            background: #3B82F6;
            color: white;
            padding: 12px 24px;
            text-decoration: none;
            border-radius: 6px;
            font-weight: 500;
            margin: 10px 5px;
        }
        ul {
            margin: 15px 0;
            padding-left: 20px;
        }
        li {
            margin-bottom: 8px;
        }
        @media (max-width: 600px) {
            .container { margin: 10px; }
            .content { padding: 20px; }
            .info-grid { grid-template-columns: 1fr; }
            .header h1 { font-size: 24px; }
            .logo { max-width: 150px; }
        }`;
}

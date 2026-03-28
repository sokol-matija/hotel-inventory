import { Building2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';

interface CompanyBillingSectionProps {
  isCompanyBilling: boolean;
  setIsCompanyBilling: (v: boolean) => void;
  selectedCompanyId: string | null;
  setSelectedCompanyId: (id: string | null) => void;
  companies: { id: number; name: string; oib: string | null; is_active: boolean | null }[];
}

export function CompanyBillingSection({
  isCompanyBilling,
  setIsCompanyBilling,
  selectedCompanyId,
  setSelectedCompanyId,
  companies,
}: CompanyBillingSectionProps) {
  const activeCompanies = companies.filter((c) => c.is_active !== false);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center text-lg">
          <Building2 className="mr-2 h-4 w-4" />
          Company Billing (R1)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center space-x-3 rounded-md border bg-gray-50 p-3">
          <input
            type="checkbox"
            id="companyBilling"
            checked={isCompanyBilling}
            onChange={(e) => {
              setIsCompanyBilling(e.target.checked);
              if (!e.target.checked) setSelectedCompanyId(null);
            }}
            className="h-4 w-4 rounded text-blue-600"
          />
          <div className="flex-1">
            <Label htmlFor="companyBilling" className="cursor-pointer font-medium">
              Bill to Company (R1 Billing)
            </Label>
            <p className="mt-1 text-xs text-gray-500">
              Invoice will be issued to the selected company instead of individual guest
            </p>
          </div>
        </div>

        {isCompanyBilling && (
          <div>
            <Label>Select Company *</Label>
            <select
              value={selectedCompanyId || ''}
              onChange={(e) => setSelectedCompanyId(e.target.value)}
              className="w-full rounded-md border bg-white p-2"
              required={isCompanyBilling}
            >
              <option value="">-- Select a company --</option>
              {activeCompanies
                .sort((a, b) => a.name.localeCompare(b.name))
                .map((company) => (
                  <option key={company.id} value={company.id}>
                    {company.name}
                    {company.oib ? ` (OIB: ${company.oib})` : ''}
                  </option>
                ))}
            </select>
            <p className="mt-2 text-xs text-gray-500">
              {activeCompanies.length} active compan
              {activeCompanies.length === 1 ? 'y' : 'ies'} available
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

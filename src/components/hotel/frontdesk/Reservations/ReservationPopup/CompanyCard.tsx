import { Card, CardContent, CardHeader, CardTitle } from '../../../../ui/card';
import { Badge } from '../../../../ui/badge';
import { User, Phone, Mail, MapPin, FileText, Building2 } from 'lucide-react';
import { Company } from '../../../../../lib/hotel/types';
import { convertToDisplayName } from '../../../../../lib/hotel/countryCodeUtils';

export interface CompanyCardProps {
  company: Company;
}

export const CompanyCard = ({ company }: CompanyCardProps) => (
  <Card className="border-blue-200 bg-blue-50/30">
    <CardHeader>
      <CardTitle className="flex items-center space-x-2">
        <Building2 className="h-5 w-5 text-blue-600" />
        <span>Company Billing (R1)</span>
        <Badge variant="outline" className="ml-2 border-blue-300 bg-blue-100 text-blue-800">
          Corporate
        </Badge>
      </CardTitle>
    </CardHeader>
    <CardContent className="space-y-4">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="space-y-3">
          <div className="flex items-start space-x-2">
            <Building2 className="mt-0.5 h-4 w-4 text-blue-600" />
            <div>
              <p className="font-semibold text-gray-900">{company.name}</p>
              <p className="text-xs text-gray-500">Company Name</p>
            </div>
          </div>
          <div className="flex items-start space-x-2">
            <FileText className="mt-0.5 h-4 w-4 text-blue-600" />
            <div>
              <p className="font-medium text-gray-900">{company.oib}</p>
              <p className="text-xs text-gray-500">OIB (Tax Number)</p>
            </div>
          </div>
          <div className="flex items-start space-x-2">
            <MapPin className="mt-0.5 h-4 w-4 text-blue-600" />
            <div>
              <p className="text-sm text-gray-700">{company.address}</p>
              <p className="text-sm text-gray-700">
                {company.postal_code} {company.city}
              </p>
              <p className="text-sm text-gray-700">{convertToDisplayName(company.country ?? '')}</p>
              <p className="text-xs text-gray-500">Address</p>
            </div>
          </div>
        </div>
        <div className="space-y-3">
          {company.contact_person && (
            <div className="flex items-start space-x-2">
              <User className="mt-0.5 h-4 w-4 text-blue-600" />
              <div>
                <p className="text-sm text-gray-700">{company.contact_person}</p>
                <p className="text-xs text-gray-500">Contact Person</p>
              </div>
            </div>
          )}
          {company.email && (
            <div className="flex items-start space-x-2">
              <Mail className="mt-0.5 h-4 w-4 text-blue-600" />
              <div>
                <p className="text-sm text-gray-700">{company.email}</p>
                <p className="text-xs text-gray-500">Email</p>
              </div>
            </div>
          )}
          {company.phone && (
            <div className="flex items-start space-x-2">
              <Phone className="mt-0.5 h-4 w-4 text-blue-600" />
              <div>
                <p className="text-sm text-gray-700">{company.phone}</p>
                <p className="text-xs text-gray-500">Phone</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </CardContent>
  </Card>
);

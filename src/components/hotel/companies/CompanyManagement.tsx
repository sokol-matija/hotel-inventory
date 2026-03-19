import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Badge } from '../../ui/badge';
import { Building2, Plus, Search, Edit, Trash2, Phone, Mail, MapPin, User } from 'lucide-react';
import { Company } from '../../../lib/hotel/types';
import { useCompanies, useDeleteCompany } from '../../../lib/queries/hooks/useCompanies';
import CreateCompanyModal from './CreateCompanyModal';
import EditCompanyModal from './EditCompanyModal';
import hotelNotification from '../../../lib/notifications';

export default function CompanyManagement() {
  const { data: companies = [] } = useCompanies();
  const deleteCompanyMutation = useDeleteCompany();
  const [searchTerm, setSearchTerm] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [filter, setFilter] = useState<'all' | 'active' | 'inactive'>('all');

  // Filter and search companies
  const filteredCompanies = useMemo(() => {
    return companies.filter((company) => {
      // Filter by status
      if (filter === 'active' && !company.isActive) return false;
      if (filter === 'inactive' && company.isActive) return false;

      // Search filter
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        return (
          company.name.toLowerCase().includes(searchLower) ||
          company.oib.includes(searchTerm) ||
          company.address.city.toLowerCase().includes(searchLower) ||
          company.email.toLowerCase().includes(searchLower)
        );
      }

      return true;
    });
  }, [companies, searchTerm, filter]);

  const handleDeleteCompany = (companyId: string, companyName: string) => {
    if (
      window.confirm(
        `Are you sure you want to delete company "${companyName}"? This action cannot be undone.`
      )
    ) {
      deleteCompanyMutation.mutate(companyId, {
        onSuccess: () =>
          hotelNotification.success(
            'Company Deleted',
            `Company "${companyName}" has been successfully deleted.`
          ),
        onError: () =>
          hotelNotification.error(
            'Deletion Failed',
            `Failed to delete company "${companyName}". Please try again.`
          ),
      });
    }
  };

  const formatDate = (dateString: string | Date) => {
    return new Date(dateString).toLocaleDateString('en-GB');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex flex-col justify-between sm:flex-row sm:items-center">
            <div className="flex items-center space-x-3">
              <Building2 className="h-6 w-6 text-blue-600" />
              <div>
                <CardTitle className="text-xl">Company Management</CardTitle>
                <p className="text-sm text-gray-500">
                  Manage corporate clients and R1 billing companies
                </p>
              </div>
            </div>
            <Button
              onClick={() => setIsCreateModalOpen(true)}
              className="mt-4 bg-blue-600 hover:bg-blue-700 sm:mt-0"
            >
              <Plus className="mr-2 h-4 w-4" />
              Add New Company
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Search and Filter */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4 sm:flex-row">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 transform text-gray-400" />
              <Input
                placeholder="Search by company name, OIB, city, or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Filter */}
            <div className="flex space-x-2">
              <Button
                variant={filter === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter('all')}
              >
                All ({companies.length})
              </Button>
              <Button
                variant={filter === 'active' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter('active')}
              >
                Active ({companies.filter((c) => c.isActive).length})
              </Button>
              <Button
                variant={filter === 'inactive' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter('inactive')}
              >
                Inactive ({companies.filter((c) => !c.isActive).length})
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Companies List */}
      <div className="grid gap-4">
        {filteredCompanies.length === 0 ? (
          <Card>
            <CardContent className="py-12 pt-6 text-center">
              <Building2 className="mx-auto mb-4 h-12 w-12 text-gray-300" />
              <h3 className="mb-2 text-lg font-medium text-gray-900">
                {searchTerm ? 'No companies found' : 'No companies yet'}
              </h3>
              <p className="mb-4 text-gray-500">
                {searchTerm
                  ? 'Try adjusting your search terms or filters'
                  : 'Start by adding your first corporate client'}
              </p>
              {!searchTerm && (
                <Button
                  onClick={() => setIsCreateModalOpen(true)}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add First Company
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          filteredCompanies.map((company) => (
            <Card key={company.id} className={!company.isActive ? 'opacity-60' : ''}>
              <CardContent className="pt-6">
                <div className="flex flex-col justify-between lg:flex-row lg:items-center">
                  {/* Company Info */}
                  <div className="flex-1 space-y-3">
                    <div className="flex items-center space-x-3">
                      <h3 className="text-lg font-semibold">{company.name}</h3>
                      <Badge variant={company.isActive ? 'default' : 'secondary'}>
                        {company.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                      {company.pricingTierId && (
                        <Badge variant="outline" className="text-xs">
                          Custom Pricing
                        </Badge>
                      )}
                    </div>

                    <div className="grid grid-cols-1 gap-3 text-sm md:grid-cols-2 lg:grid-cols-3">
                      <div className="flex items-center space-x-2">
                        <Badge variant="outline" className="font-mono text-xs">
                          OIB
                        </Badge>
                        <span className="font-medium">{company.oib}</span>
                      </div>

                      <div className="flex items-center space-x-2">
                        <MapPin className="h-4 w-4 text-gray-400" />
                        <span>
                          {company.address.city}, {company.address.country}
                        </span>
                      </div>

                      {company.email && (
                        <div className="flex items-center space-x-2">
                          <Mail className="h-4 w-4 text-gray-400" />
                          <span>{company.email}</span>
                        </div>
                      )}

                      {company.phone && (
                        <div className="flex items-center space-x-2">
                          <Phone className="h-4 w-4 text-gray-400" />
                          <span>{company.phone}</span>
                        </div>
                      )}

                      {company.contactPerson && (
                        <div className="flex items-center space-x-2">
                          <User className="h-4 w-4 text-gray-400" />
                          <span>{company.contactPerson}</span>
                        </div>
                      )}

                      <div className="text-xs text-gray-500">
                        Created: {formatDate(company.createdAt)}
                      </div>
                    </div>

                    {company.notes && (
                      <div className="rounded bg-gray-50 p-2 text-sm text-gray-600">
                        <strong>Notes:</strong> {company.notes}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="mt-4 flex items-center space-x-2 lg:mt-0">
                    <Button variant="outline" size="sm" onClick={() => setEditingCompany(company)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteCompany(company.id, company.name)}
                      className="text-red-600 hover:border-red-300 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Modals */}
      <CreateCompanyModal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} />

      {editingCompany && (
        <EditCompanyModal
          isOpen={!!editingCompany}
          onClose={() => setEditingCompany(null)}
          company={editingCompany}
        />
      )}
    </div>
  );
}

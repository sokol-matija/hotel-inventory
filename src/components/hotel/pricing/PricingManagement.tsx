import React, { useState, useMemo } from 'react';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { useHotel } from '../../../lib/hotel/state/HotelContext';
import { PricingTier } from '../../../lib/hotel/types';
import { Search, Plus, Edit, Trash2, Star, Calendar, DollarSign } from 'lucide-react';
import CreatePricingTierModal from './CreatePricingTierModal';
import EditPricingTierModal from './EditPricingTierModal';

export default function PricingManagement() {
  const { pricingTiers, deletePricingTier } = useHotel();
  const [searchTerm, setSearchTerm] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingTier, setEditingTier] = useState<PricingTier | null>(null);

  // Filter pricing tiers based on search term
  const filteredPricingTiers = useMemo(() => {
    if (!searchTerm.trim()) return pricingTiers;
    
    const searchLower = searchTerm.toLowerCase().trim();
    return pricingTiers.filter(tier =>
      tier.name.toLowerCase().includes(searchLower) ||
      tier.description.toLowerCase().includes(searchLower) ||
      tier.roomTypes.some(roomType => roomType.toLowerCase().includes(searchLower))
    );
  }, [pricingTiers, searchTerm]);

  const handleDeleteTier = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this pricing tier? This action cannot be undone.')) {
      try {
        await deletePricingTier(id);
      } catch (error) {
        console.error('Failed to delete pricing tier:', error);
        alert('Failed to delete pricing tier. ' + (error instanceof Error ? error.message : 'Please try again.'));
      }
    }
  };

  const handleCreateSuccess = () => {
    setIsCreateModalOpen(false);
  };

  const handleEditSuccess = () => {
    setEditingTier(null);
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-GB');
  };

  const formatModifier = (value: number, isPercentage: boolean = true) => {
    if (isPercentage) {
      return `${value > 0 ? '+' : ''}${value}%`;
    }
    return `€${value.toFixed(2)}`;
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Pricing Management</h1>
          <p className="text-gray-600 mt-1">
            Create and manage custom pricing tiers for different booking scenarios
          </p>
        </div>
        <Button 
          onClick={() => setIsCreateModalOpen(true)}
          className="bg-blue-600 hover:bg-blue-700"
        >
          <Plus className="w-4 h-4 mr-2" />
          Create Pricing Tier
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
        <Input
          placeholder="Search pricing tiers by name, description, or room type..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center">
            <DollarSign className="w-5 h-5 text-green-600 mr-2" />
            <div>
              <p className="text-sm text-gray-600">Total Tiers</p>
              <p className="text-xl font-semibold text-gray-900">{pricingTiers.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center">
            <Calendar className="w-5 h-5 text-blue-600 mr-2" />
            <div>
              <p className="text-sm text-gray-600">Active Tiers</p>
              <p className="text-xl font-semibold text-gray-900">
                {pricingTiers.filter(tier => tier.isActive && new Date() >= tier.validFrom && new Date() <= tier.validTo).length}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center">
            <Star className="w-5 h-5 text-yellow-600 mr-2" />
            <div>
              <p className="text-sm text-gray-600">Default Tier</p>
              <p className="text-xl font-semibold text-gray-900">
                {pricingTiers.filter(tier => tier.isDefault).length > 0 ? '1' : '0'}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center">
            <Search className="w-5 h-5 text-purple-600 mr-2" />
            <div>
              <p className="text-sm text-gray-600">Search Results</p>
              <p className="text-xl font-semibold text-gray-900">{filteredPricingTiers.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Pricing Tiers Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left py-3 px-4 font-medium text-gray-900">Name</th>
                <th className="text-left py-3 px-4 font-medium text-gray-900">Description</th>
                <th className="text-left py-3 px-4 font-medium text-gray-900">Room Types</th>
                <th className="text-left py-3 px-4 font-medium text-gray-900">Valid Period</th>
                <th className="text-left py-3 px-4 font-medium text-gray-900">Status</th>
                <th className="text-left py-3 px-4 font-medium text-gray-900">Rate Modifiers</th>
                <th className="text-left py-3 px-4 font-medium text-gray-900">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredPricingTiers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-gray-500">
                    {searchTerm ? 'No pricing tiers match your search.' : 'No pricing tiers found. Create your first pricing tier to get started.'}
                  </td>
                </tr>
              ) : (
                filteredPricingTiers.map((tier) => {
                  const now = new Date();
                  const isActive = tier.isActive && now >= tier.validFrom && now <= tier.validTo;
                  
                  return (
                    <tr key={tier.id} className="hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <div className="flex items-center">
                          <div>
                            <p className="font-medium text-gray-900">{tier.name}</p>
                            {tier.isDefault && (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-yellow-100 text-yellow-800 mt-1">
                                <Star className="w-3 h-3 mr-1" />
                                Default
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <p className="text-gray-900 text-sm">{tier.description}</p>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex flex-wrap gap-1">
                          {tier.roomTypes.map((roomType) => (
                            <span
                              key={roomType}
                              className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800"
                            >
                              {roomType}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-900">
                        <div>
                          <p>{formatDate(tier.validFrom)}</p>
                          <p className="text-gray-500">to {formatDate(tier.validTo)}</p>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="space-y-1">
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs ${
                            isActive 
                              ? 'bg-green-100 text-green-800' 
                              : tier.isActive 
                                ? 'bg-yellow-100 text-yellow-800'
                                : 'bg-gray-100 text-gray-800'
                          }`}>
                            {isActive ? 'Active' : tier.isActive ? 'Scheduled' : 'Inactive'}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-sm">
                        <div className="space-y-1">
                          <p><span className="text-gray-600">A:</span> {formatModifier(tier.seasonalRateModifiers.A)}</p>
                          <p><span className="text-gray-600">B:</span> {formatModifier(tier.seasonalRateModifiers.B)}</p>
                          <p><span className="text-gray-600">C:</span> {formatModifier(tier.seasonalRateModifiers.C)}</p>
                          <p><span className="text-gray-600">D:</span> {formatModifier(tier.seasonalRateModifiers.D)}</p>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center space-x-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setEditingTier(tier)}
                            className="text-blue-600 hover:text-blue-800"
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteTier(tier.id)}
                            disabled={tier.isDefault}
                            className={`${tier.isDefault ? 'text-gray-400 cursor-not-allowed' : 'text-red-600 hover:text-red-800'}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Pricing Tier Modal */}
      <CreatePricingTierModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={handleCreateSuccess}
      />

      {/* Edit Pricing Tier Modal */}
      {editingTier && (
        <EditPricingTierModal
          isOpen={!!editingTier}
          tier={editingTier}
          onClose={() => setEditingTier(null)}
          onSuccess={handleEditSuccess}
        />
      )}
    </div>
  );
}
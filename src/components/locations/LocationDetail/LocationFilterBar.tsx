import { Card, CardContent } from '../../ui/card';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select';
import { Search } from 'lucide-react';

interface Category {
  id: number;
  name: string;
}

interface LocationFilterBarProps {
  searchTerm: string;
  selectedCategory: string;
  uniqueCategories: Category[];
  onSearchChange: (value: string) => void;
  onCategoryChange: (value: string) => void;
  onClearFilters: () => void;
  translateCategory: (name: string) => string;
}

export function LocationFilterBar({
  searchTerm,
  selectedCategory,
  uniqueCategories,
  onSearchChange,
  onCategoryChange,
  onClearFilters,
  translateCategory,
}: LocationFilterBarProps) {
  return (
    <Card className="mb-6">
      <CardContent className="p-4">
        <div className="flex flex-col space-y-2 md:flex-row md:space-y-0 md:space-x-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 transform text-gray-400" />
              <Input
                placeholder="Search items or categories..."
                value={searchTerm}
                onChange={(e) => onSearchChange(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <Select value={selectedCategory} onValueChange={onCategoryChange}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="All categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              {uniqueCategories.map((category) => (
                <SelectItem key={category.id} value={category.name}>
                  {translateCategory(category.name)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {(searchTerm || selectedCategory !== 'all') && (
            <Button variant="outline" onClick={onClearFilters}>
              Clear Filters
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

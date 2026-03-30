import { Card, CardContent, CardHeader, CardTitle } from '../../../../ui/card';
import { Button } from '../../../../ui/button';
import { CreditCard } from 'lucide-react';

export interface PaymentCardProps {
  chargesTotalAmount: number;
  nights: number;
  onViewBreakdown: () => void;
}

export const PaymentCard = ({ chargesTotalAmount, nights, onViewBreakdown }: PaymentCardProps) => (
  <Card>
    <CardHeader>
      <CardTitle className="flex items-center space-x-2">
        <CreditCard className="h-5 w-5" />
        <span>Payment Information</span>
      </CardTitle>
    </CardHeader>
    <CardContent>
      <div className="flex items-center justify-between">
        <div>
          <div className="text-lg font-bold">€{chargesTotalAmount.toFixed(2)}</div>
          <div className="text-sm text-gray-500">Total Amount • {nights} nights</div>
        </div>
        <Button variant="outline" onClick={onViewBreakdown}>
          View Breakdown
        </Button>
      </div>
    </CardContent>
  </Card>
);

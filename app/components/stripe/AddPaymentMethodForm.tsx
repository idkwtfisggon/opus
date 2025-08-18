import { useState } from "react";
import { useStripe, useElements, CardElement } from "@stripe/react-stripe-js";
import { Button } from "~/components/ui/button";
import { Label } from "~/components/ui/label";
import { Input } from "~/components/ui/input";
import { useAction } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Lock, AlertCircle } from "lucide-react";

interface AddPaymentMethodFormProps {
  onSuccess: () => void;
  onCancel: () => void;
  clientSecret: string;
}

export default function AddPaymentMethodForm({ onSuccess, onCancel, clientSecret }: AddPaymentMethodFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [holderName, setHolderName] = useState("");
  const [isDefault, setIsDefault] = useState(false);
  
  const setDefaultPaymentMethod = useAction(api.stripe.setDefaultPaymentMethod);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    if (!stripe || !elements) {
      setError("Stripe has not loaded yet");
      return;
    }

    if (!holderName.trim()) {
      setError("Please enter the cardholder name");
      return;
    }

    const cardElement = elements.getElement(CardElement);
    if (!cardElement) {
      setError("Card element not found");
      return;
    }

    setIsLoading(true);

    try {
      // Confirm the setup intent
      const { error: confirmError, setupIntent } = await stripe.confirmCardSetup(
        clientSecret,
        {
          payment_method: {
            card: cardElement,
            billing_details: {
              name: holderName,
            },
          },
        }
      );

      if (confirmError) {
        throw new Error(confirmError.message);
      }

      if (setupIntent?.payment_method && isDefault) {
        // Set as default payment method
        await setDefaultPaymentMethod({
          paymentMethodId: setupIntent.payment_method as string,
        });
      }

      onSuccess();
    } catch (err: any) {
      console.error("Error adding payment method:", err);
      setError(err.message || "Failed to add payment method");
    } finally {
      setIsLoading(false);
    }
  };

  const cardElementOptions = {
    style: {
      base: {
        fontSize: '16px',
        color: '#374151',
        fontFamily: 'system-ui, sans-serif',
        '::placeholder': {
          color: '#9CA3AF',
        },
        iconColor: '#6B7280',
      },
      invalid: {
        color: '#DC2626',
        iconColor: '#DC2626',
      },
    },
    hidePostalCode: true,
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="holderName">Cardholder Name</Label>
        <Input
          id="holderName"
          value={holderName}
          onChange={(e) => setHolderName(e.target.value)}
          placeholder="John Doe"
          className="mt-1"
          required
        />
      </div>

      <div>
        <Label>Card Information</Label>
        <div className="mt-1 p-3 border border-gray-300 rounded-md focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-transparent">
          <CardElement options={cardElementOptions} />
        </div>
      </div>

      <div className="flex items-center">
        <input
          type="checkbox"
          id="isDefault"
          checked={isDefault}
          onChange={(e) => setIsDefault(e.target.checked)}
          className="w-4 h-4 text-primary focus:ring-primary border-gray-300 rounded"
        />
        <Label htmlFor="isDefault" className="ml-2 text-sm">
          Set as default payment method
        </Label>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-md">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-600" />
            <p className="text-sm text-red-800">{error}</p>
          </div>
        </div>
      )}

      <div className="p-4 bg-green-50 rounded-lg border border-green-200">
        <div className="flex items-center gap-2 mb-2">
          <Lock className="w-4 h-4 text-green-600" />
          <h5 className="font-medium text-green-900">Secure Payment</h5>
        </div>
        <p className="text-sm text-green-800">
          Your payment information is encrypted and securely processed by Stripe. 
          We never store your card details on our servers.
        </p>
      </div>

      <div className="flex gap-3 pt-2">
        <Button 
          type="submit" 
          disabled={!stripe || isLoading}
          className="flex-1"
        >
          {isLoading ? "Adding..." : "Add Payment Method"}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isLoading}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
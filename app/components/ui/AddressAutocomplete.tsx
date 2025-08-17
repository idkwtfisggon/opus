"use client";

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Input } from './input';
import { Label } from './label';
import { 
  getAddressPredictions, 
  getPlaceDetails, 
  convertPlaceToFormData,
  type PlacePrediction 
} from '~/utils/addressValidation';
import { MapPin, Loader2, AlertCircle } from 'lucide-react';

interface AddressAutocompleteProps {
  label?: string;
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
  onAddressSelect?: (addressData: {
    address: string;
    city: string;
    state: string;
    country: string;
    postalCode: string;
  }) => void;
  countryBias?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  error?: boolean;
}

export default function AddressAutocomplete({
  label,
  placeholder = "Start typing an address...",
  value,
  onChange,
  onAddressSelect,
  countryBias,
  required = false,
  disabled = false,
  className = "",
  error = false
}: AddressAutocompleteProps) {
  const [predictions, setPredictions] = useState<PlacePrediction[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [apiError, setApiError] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout>();

  // Debounced search function
  const searchAddresses = useCallback(async (searchTerm: string) => {
    if (searchTerm.length < 3) {
      setPredictions([]);
      setIsOpen(false);
      return;
    }

    setIsLoading(true);
    setApiError(null);

    try {
      const result = await getAddressPredictions(searchTerm, countryBias);
      
      if (result.error) {
        setApiError(result.error);
        setPredictions([]);
      } else {
        setPredictions(result.predictions || []);
        setIsOpen((result.predictions || []).length > 0);
      }
    } catch (error) {
      console.error('Error searching addresses:', error);
      setApiError('Failed to search addresses');
      setPredictions([]);
    } finally {
      setIsLoading(false);
    }
  }, [countryBias]);

  // Handle input change with debouncing
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    onChange(newValue);
    setSelectedIndex(-1);

    // Clear existing debounce
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    // Debounce the API call
    debounceRef.current = setTimeout(() => {
      searchAddresses(newValue);
    }, 300);
  };

  // Handle prediction selection
  const handlePredictionSelect = async (prediction: PlacePrediction) => {
    setIsLoading(true);
    setIsOpen(false);
    onChange(prediction.description);

    try {
      const result = await getPlaceDetails(prediction.place_id);
      
      if (result.error) {
        setApiError(result.error);
      } else if (result.details && onAddressSelect) {
        const addressData = convertPlaceToFormData(result.details);
        onAddressSelect(addressData);
      }
    } catch (error) {
      console.error('Error getting place details:', error);
      setApiError('Failed to get address details');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || predictions.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < predictions.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev > 0 ? prev - 1 : predictions.length - 1
        );
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0) {
          handlePredictionSelect(predictions[selectedIndex]);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        setSelectedIndex(-1);
        inputRef.current?.blur();
        break;
    }
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (listRef.current && !listRef.current.contains(event.target as Node) &&
          inputRef.current && !inputRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSelectedIndex(-1);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Clean up debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  return (
    <div className="relative">
      {label && (
        <Label htmlFor="address-autocomplete" className="block mb-2">
          {label} {required && <span className="text-red-500">*</span>}
        </Label>
      )}
      
      <div className="relative">
        <Input
          ref={inputRef}
          id="address-autocomplete"
          type="text"
          value={value}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (predictions.length > 0) {
              setIsOpen(true);
            }
          }}
          placeholder={placeholder}
          disabled={disabled}
          className={`${className} ${error ? 'border-red-500' : ''} pr-10`}
          autoComplete="off"
        />
        
        {/* Loading spinner or search icon */}
        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          ) : (
            <MapPin className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
      </div>

      {/* Error message */}
      {apiError && (
        <div className="flex items-center gap-1 mt-1 text-sm text-red-600">
          <AlertCircle className="h-3 w-3" />
          <span>{apiError}</span>
        </div>
      )}

      {/* Predictions dropdown */}
      {isOpen && predictions.length > 0 && (
        <div
          ref={listRef}
          className="absolute z-50 w-full mt-1 bg-background border border-border rounded-lg shadow-lg max-h-64 overflow-y-auto"
        >
          {predictions.map((prediction, index) => (
            <button
              key={prediction.place_id}
              onClick={() => handlePredictionSelect(prediction)}
              className={`w-full text-left px-4 py-3 hover:bg-muted transition-colors border-b border-border last:border-b-0 ${
                index === selectedIndex ? 'bg-muted' : ''
              }`}
            >
              <div className="flex items-start gap-3">
                <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="font-medium text-foreground text-sm">
                    {prediction.structured_formatting.main_text}
                  </div>
                  <div className="text-muted-foreground text-xs mt-0.5">
                    {prediction.structured_formatting.secondary_text}
                  </div>
                </div>
              </div>
            </button>
          ))}
          
          {/* Powered by Google */}
          <div className="px-4 py-2 text-xs text-muted-foreground text-center border-t border-border bg-muted/30">
            Powered by Google
          </div>
        </div>
      )}

      {/* No results message */}
      {isOpen && predictions.length === 0 && !isLoading && value.length >= 3 && (
        <div className="absolute z-50 w-full mt-1 bg-background border border-border rounded-lg shadow-lg p-4 text-center text-muted-foreground text-sm">
          No addresses found. Try a different search term.
        </div>
      )}
    </div>
  );
}
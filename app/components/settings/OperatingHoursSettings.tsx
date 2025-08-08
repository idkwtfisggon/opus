"use client";

import { useState, useEffect } from "react";
import { useMutation } from "convex/react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { api } from "../../../convex/_generated/api";
import { Clock, Calendar, Plus, X } from "lucide-react";

interface OperatingHoursSettingsProps {
  forwarderId: string;
  currentOperatingHours?: any;
  currentHolidaySchedule?: any[];
  businessName: string;
}

const DAYS = [
  { key: 'monday', label: 'Monday' },
  { key: 'tuesday', label: 'Tuesday' },
  { key: 'wednesday', label: 'Wednesday' },
  { key: 'thursday', label: 'Thursday' },
  { key: 'friday', label: 'Friday' },
  { key: 'saturday', label: 'Saturday' },
  { key: 'sunday', label: 'Sunday' },
];

export default function OperatingHoursSettings({ 
  forwarderId, 
  currentOperatingHours,
  currentHolidaySchedule,
  businessName
}: OperatingHoursSettingsProps) {
  const [formData, setFormData] = useState({
    operatingHours: currentOperatingHours || {},
    holidaySchedule: currentHolidaySchedule || []
  });
  const [loading, setLoading] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [newHoliday, setNewHoliday] = useState({ 
    name: '', 
    startDate: '', 
    endDate: '', 
    type: 'closed' as 'closed' | 'modified_hours',
    modifiedHours: { open: '09:00', close: '17:00' }
  });

  const updateOperatingHours = useMutation(api.forwarders.updateOperatingHours);

  useEffect(() => {
    setFormData({
      operatingHours: currentOperatingHours || {},
      holidaySchedule: currentHolidaySchedule || []
    });
  }, [currentOperatingHours, currentHolidaySchedule]);

  useEffect(() => {
    const changed = (
      JSON.stringify(formData.operatingHours) !== JSON.stringify(currentOperatingHours || {}) ||
      JSON.stringify(formData.holidaySchedule) !== JSON.stringify(currentHolidaySchedule || [])
    );
    setHasChanges(changed);
  }, [formData, currentOperatingHours, currentHolidaySchedule]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hasChanges) return;

    setLoading(true);
    try {
      await updateOperatingHours({
        forwarderId,
        operatingHours: Object.keys(formData.operatingHours).length > 0 ? formData.operatingHours : undefined,
        holidaySchedule: formData.holidaySchedule.length > 0 ? formData.holidaySchedule : undefined,
      });

      setHasChanges(false);
      alert('Operating hours updated successfully!');
    } catch (error) {
      console.error('Failed to update operating hours:', error);
      alert('Failed to update operating hours. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setFormData({
      operatingHours: currentOperatingHours || {},
      holidaySchedule: currentHolidaySchedule || []
    });
  };

  const updateDaySchedule = (day: string, field: string, value: string | boolean) => {
    setFormData(prev => ({
      ...prev,
      operatingHours: {
        ...prev.operatingHours,
        [day]: {
          ...prev.operatingHours[day],
          [field]: value
        }
      }
    }));
  };

  const toggleDayClosed = (day: string) => {
    setFormData(prev => ({
      ...prev,
      operatingHours: {
        ...prev.operatingHours,
        [day]: {
          ...prev.operatingHours[day],
          closed: !prev.operatingHours[day]?.closed
        }
      }
    }));
  };

  const addHoliday = () => {
    if (!newHoliday.name || !newHoliday.startDate) return;
    
    const holidayToAdd = {
      ...newHoliday,
      // Only include modifiedHours if type is modified_hours
      modifiedHours: newHoliday.type === 'modified_hours' ? newHoliday.modifiedHours : undefined
    };
    
    setFormData(prev => ({
      ...prev,
      holidaySchedule: [...prev.holidaySchedule, holidayToAdd]
    }));
    
    setNewHoliday({ 
      name: '', 
      startDate: '', 
      endDate: '', 
      type: 'closed',
      modifiedHours: { open: '09:00', close: '17:00' }
    });
  };

  const removeHoliday = (index: number) => {
    setFormData(prev => ({
      ...prev,
      holidaySchedule: prev.holidaySchedule.filter((_, i) => i !== index)
    }));
  };

  const isFullyOperational = !formData.operatingHours || Object.keys(formData.operatingHours).length === 0;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Operating Hours
          </CardTitle>
          <CardDescription>
            Set your business operating hours. If not specified, customers will see you as fully operational 24/7.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Current Status */}
            <div className="bg-muted/30 rounded-lg p-4">
              <h4 className="text-sm font-medium text-foreground mb-2">Current Status</h4>
              <div className="text-sm">
                {isFullyOperational ? (
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-green-500"></div>
                    <span className="text-green-700">Fully Operational (24/7)</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                    <span className="text-blue-700">Custom Operating Hours Set</span>
                  </div>
                )}
              </div>
            </div>

            {/* Weekly Schedule */}
            <div className="space-y-4">
              <h4 className="text-base font-medium text-foreground">Weekly Schedule</h4>
              <div className="space-y-3">
                {DAYS.map((day) => {
                  const daySchedule = formData.operatingHours[day.key] || {};
                  const isClosed = daySchedule.closed;
                  
                  return (
                    <div key={day.key} className="flex items-center gap-4 p-3 border border-border rounded-lg">
                      <div className="w-20">
                        <span className="text-sm font-medium">{day.label}</span>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={isClosed || false}
                          onChange={() => toggleDayClosed(day.key)}
                          className="rounded border-border"
                        />
                        <span className="text-sm text-muted-foreground">Closed</span>
                      </div>

                      {!isClosed && (
                        <>
                          <div className="flex items-center gap-2">
                            <Label className="text-xs">Open:</Label>
                            <Input
                              type="time"
                              value={daySchedule.open || "09:00"}
                              onChange={(e) => updateDaySchedule(day.key, 'open', e.target.value)}
                              className="w-24 h-8 text-sm"
                            />
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <Label className="text-xs">Close:</Label>
                            <Input
                              type="time"
                              value={daySchedule.close || "17:00"}
                              onChange={(e) => updateDaySchedule(day.key, 'close', e.target.value)}
                              className="w-24 h-8 text-sm"
                            />
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
              
              <div className="text-xs text-muted-foreground">
                💡 Leave all days unconfigured to appear as fully operational 24/7
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-between pt-4 border-t border-border">
              <Button
                type="button"
                variant="outline"
                onClick={handleReset}
                disabled={!hasChanges || loading}
              >
                Reset Changes
              </Button>
              <Button
                type="submit"
                disabled={!hasChanges || loading}
                className="bg-primary hover:bg-primary/90"
              >
                {loading ? "Saving..." : "Save Operating Hours"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Holiday Schedule */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Holiday Schedule
          </CardTitle>
          <CardDescription>
            Configure special dates when your operations may be closed or have modified hours.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Add New Holiday */}
          <div className="bg-muted/30 rounded-lg p-4 space-y-4">
            <h4 className="text-sm font-medium text-foreground">Add Holiday/Special Period</h4>
            
            {/* Holiday Name */}
            <div>
              <Label className="text-sm font-medium">Holiday Name</Label>
              <Input
                placeholder="e.g. Chinese New Year, Christmas"
                value={newHoliday.name}
                onChange={(e) => setNewHoliday({ ...newHoliday, name: e.target.value })}
                className="mt-1"
              />
            </div>

            {/* Date Range */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium">Start Date</Label>
                <Input
                  type="date"
                  value={newHoliday.startDate}
                  onChange={(e) => setNewHoliday({ ...newHoliday, startDate: e.target.value })}
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-sm font-medium">End Date (Optional)</Label>
                <Input
                  type="date"
                  value={newHoliday.endDate}
                  onChange={(e) => setNewHoliday({ ...newHoliday, endDate: e.target.value })}
                  className="mt-1"
                  min={newHoliday.startDate}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Leave empty for single day. Set for multi-day periods (e.g. CNY week)
                </p>
              </div>
            </div>

            {/* Holiday Type */}
            <div>
              <Label className="text-sm font-medium">Operation Type</Label>
              <div className="flex gap-4 mt-2">
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="holidayType"
                    checked={newHoliday.type === 'closed'}
                    onChange={() => setNewHoliday({ ...newHoliday, type: 'closed' })}
                  />
                  <span className="text-sm">Fully Closed</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="holidayType"
                    checked={newHoliday.type === 'modified_hours'}
                    onChange={() => setNewHoliday({ ...newHoliday, type: 'modified_hours' })}
                  />
                  <span className="text-sm">Modified Hours</span>
                </label>
              </div>
            </div>

            {/* Modified Hours (only show if modified_hours selected) */}
            {newHoliday.type === 'modified_hours' && (
              <div className="bg-background border border-border rounded-lg p-3">
                <Label className="text-sm font-medium">Special Hours</Label>
                <div className="grid grid-cols-2 gap-3 mt-2">
                  <div>
                    <Label className="text-xs">Open:</Label>
                    <Input
                      type="time"
                      value={newHoliday.modifiedHours.open}
                      onChange={(e) => setNewHoliday({ 
                        ...newHoliday, 
                        modifiedHours: { ...newHoliday.modifiedHours, open: e.target.value }
                      })}
                      className="h-8 text-sm"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Close:</Label>
                    <Input
                      type="time"
                      value={newHoliday.modifiedHours.close}
                      onChange={(e) => setNewHoliday({ 
                        ...newHoliday, 
                        modifiedHours: { ...newHoliday.modifiedHours, close: e.target.value }
                      })}
                      className="h-8 text-sm"
                    />
                  </div>
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <Button
                type="button"
                onClick={addHoliday}
                disabled={!newHoliday.name || !newHoliday.startDate}
                className="flex items-center gap-2 flex-1"
              >
                <Plus className="w-4 h-4" />
                Add Holiday Period
              </Button>
            </div>

            {/* Quick Presets */}
            <div className="border-t border-border pt-3">
              <Label className="text-xs text-muted-foreground mb-2 block">Quick Presets (2024):</Label>
              <div className="flex flex-wrap gap-2">
                {[
                  { name: 'Chinese New Year', start: '2024-02-10', end: '2024-02-16', type: 'closed' },
                  { name: 'Good Friday', start: '2024-03-29', end: '', type: 'closed' },
                  { name: 'Labour Day', start: '2024-05-01', end: '', type: 'closed' },
                  { name: 'Vesak Day', start: '2024-05-22', end: '', type: 'closed' },
                  { name: 'Christmas Day', start: '2024-12-25', end: '', type: 'closed' }
                ].map((preset) => (
                  <button
                    key={preset.name}
                    type="button"
                    onClick={() => setNewHoliday({
                      name: preset.name,
                      startDate: preset.start,
                      endDate: preset.end,
                      type: preset.type as 'closed' | 'modified_hours',
                      modifiedHours: { open: '09:00', close: '17:00' }
                    })}
                    className="text-xs px-2 py-1 bg-muted hover:bg-muted/80 rounded border border-border transition-colors"
                  >
                    {preset.name}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Holiday List */}
          <div className="space-y-3">
            {formData.holidaySchedule.map((holiday, index) => {
              const startDate = new Date(holiday.startDate);
              const endDate = holiday.endDate ? new Date(holiday.endDate) : null;
              const isMultiDay = endDate && endDate.getTime() !== startDate.getTime();
              
              return (
                <div key={index} className="border border-border rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="font-medium text-foreground">{holiday.name}</h4>
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          holiday.type === 'closed' 
                            ? 'bg-red-100 text-red-800' 
                            : 'bg-blue-100 text-blue-800'
                        }`}>
                          {holiday.type === 'closed' ? 'Closed' : 'Modified Hours'}
                        </span>
                      </div>
                      
                      <div className="text-sm text-muted-foreground space-y-1">
                        <div>
                          <span className="font-medium">Date:</span>{' '}
                          {isMultiDay ? (
                            <>
                              {startDate.toLocaleDateString()} - {endDate?.toLocaleDateString()}
                              <span className="ml-2 text-xs bg-gray-100 px-2 py-0.5 rounded">
                                {Math.ceil((endDate!.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24) + 1)} days
                              </span>
                            </>
                          ) : (
                            startDate.toLocaleDateString()
                          )}
                        </div>
                        
                        {holiday.type === 'modified_hours' && holiday.modifiedHours && (
                          <div>
                            <span className="font-medium">Special Hours:</span>{' '}
                            {holiday.modifiedHours.open} - {holiday.modifiedHours.close}
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => removeHoliday(index)}
                      className="text-red-600 hover:text-red-800"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
            
            {formData.holidaySchedule.length === 0 && (
              <div className="text-center py-4 text-muted-foreground text-sm">
                No holidays configured. Add holidays above to inform customers of closures.
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
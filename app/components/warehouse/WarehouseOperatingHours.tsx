"use client";

import { useState, useEffect } from "react";
import { Clock, Calendar, Plus, X } from "lucide-react";

interface WarehouseOperatingHoursProps {
  warehouseName: string;
  currentOperatingHours?: any;
  currentHolidaySchedule?: any[];
  onOperatingHoursChange: (operatingHours: any, holidaySchedule: any[]) => void;
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

export default function WarehouseOperatingHours({ 
  warehouseName,
  currentOperatingHours,
  currentHolidaySchedule,
  onOperatingHoursChange
}: WarehouseOperatingHoursProps) {
  const [formData, setFormData] = useState({
    operatingHours: currentOperatingHours || {
      monday: { open: "09:00", close: "17:00" },
      tuesday: { open: "09:00", close: "17:00" },
      wednesday: { open: "09:00", close: "17:00" },
      thursday: { open: "09:00", close: "17:00" },
      friday: { open: "09:00", close: "17:00" },
      saturday: { closed: true },
      sunday: { closed: true },
    },
    holidaySchedule: currentHolidaySchedule || []
  });
  
  const [newHoliday, setNewHoliday] = useState({ 
    name: '', 
    startDate: '', 
    endDate: '', 
    type: 'closed' as 'closed' | 'modified_hours',
    modifiedHours: { open: '09:00', close: '17:00' }
  });

  useEffect(() => {
    setFormData({
      operatingHours: currentOperatingHours || {
        monday: { open: "09:00", close: "17:00" },
        tuesday: { open: "09:00", close: "17:00" },
        wednesday: { open: "09:00", close: "17:00" },
        thursday: { open: "09:00", close: "17:00" },
        friday: { open: "09:00", close: "17:00" },
        saturday: { closed: true },
        sunday: { closed: true },
      },
      holidaySchedule: currentHolidaySchedule || []
    });
  }, [currentOperatingHours, currentHolidaySchedule]);

  useEffect(() => {
    onOperatingHoursChange(formData.operatingHours, formData.holidaySchedule);
  }, [formData, onOperatingHoursChange]);

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

  const isFullyOperational = !formData.operatingHours || 
    Object.values(formData.operatingHours).every((day: any) => !day || day.closed);

  return (
    <div className="space-y-6">
      {/* Operating Hours Section */}
      <div className="border border-gray-200 rounded-lg p-4">
        <div className="flex items-center gap-2 mb-4">
          <Clock className="w-5 h-5 text-gray-600" />
          <h3 className="text-lg font-medium text-gray-900">Operating Hours</h3>
        </div>
        <p className="text-sm text-gray-600 mb-4">
          Set operating hours for {warehouseName}. These will override forwarder default hours.
        </p>
        
        {/* Current Status */}
        <div className="bg-gray-50 rounded-lg p-4 mb-4">
          <h4 className="text-sm font-medium text-gray-900 mb-2">Current Status</h4>
          <div className="text-sm">
            {isFullyOperational ? (
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-red-500"></div>
                <span className="text-red-700">All Days Closed - Check Schedule!</span>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-500"></div>
                <span className="text-green-700">Custom Operating Hours Set</span>
              </div>
            )}
          </div>
        </div>

        {/* Weekly Schedule */}
        <div className="space-y-3">
          {DAYS.map((day) => {
            const daySchedule = formData.operatingHours[day.key] || {};
            const isClosed = daySchedule.closed;
            
            return (
              <div key={day.key} className="flex items-center gap-4 p-3 border border-gray-200 rounded-lg">
                <div className="w-20">
                  <span className="text-sm font-medium">{day.label}</span>
                </div>
                
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={isClosed || false}
                    onChange={() => toggleDayClosed(day.key)}
                    className="rounded border-gray-300"
                  />
                  <span className="text-sm text-gray-600">Closed</span>
                </div>

                {!isClosed && (
                  <>
                    <div className="flex items-center gap-2">
                      <label className="text-xs text-gray-600">Open:</label>
                      <input
                        type="time"
                        value={daySchedule.open || "09:00"}
                        onChange={(e) => updateDaySchedule(day.key, 'open', e.target.value)}
                        className="w-24 h-8 text-sm px-2 border border-gray-300 rounded"
                      />
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <label className="text-xs text-gray-600">Close:</label>
                      <input
                        type="time"
                        value={daySchedule.close || "17:00"}
                        onChange={(e) => updateDaySchedule(day.key, 'close', e.target.value)}
                        className="w-24 h-8 text-sm px-2 border border-gray-300 rounded"
                      />
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Holiday Schedule Section */}
      <div className="border border-gray-200 rounded-lg p-4">
        <div className="flex items-center gap-2 mb-4">
          <Calendar className="w-5 h-5 text-gray-600" />
          <h3 className="text-lg font-medium text-gray-900">Holiday Schedule</h3>
        </div>
        <p className="text-sm text-gray-600 mb-4">
          Configure special dates when this warehouse may be closed or have modified hours.
        </p>
        
        {/* Add New Holiday */}
        <div className="bg-gray-50 rounded-lg p-4 space-y-4 mb-4">
          <h4 className="text-sm font-medium text-gray-900">Add Holiday/Special Period</h4>
          
          {/* Holiday Name */}
          <div>
            <label className="text-sm font-medium text-gray-700">Holiday Name</label>
            <input
              type="text"
              placeholder="e.g. Chinese New Year, Christmas"
              value={newHoliday.name}
              onChange={(e) => setNewHoliday({ ...newHoliday, name: e.target.value })}
              className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Date Range */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700">Start Date</label>
              <input
                type="date"
                value={newHoliday.startDate}
                onChange={(e) => setNewHoliday({ ...newHoliday, startDate: e.target.value })}
                className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">End Date (Optional)</label>
              <input
                type="date"
                value={newHoliday.endDate}
                onChange={(e) => setNewHoliday({ ...newHoliday, endDate: e.target.value })}
                className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                min={newHoliday.startDate}
              />
              <p className="text-xs text-gray-500 mt-1">
                Leave empty for single day. Set for multi-day periods.
              </p>
            </div>
          </div>

          {/* Holiday Type */}
          <div>
            <label className="text-sm font-medium text-gray-700">Operation Type</label>
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
            <div className="bg-white border border-gray-200 rounded-lg p-3">
              <label className="text-sm font-medium text-gray-700">Special Hours</label>
              <div className="grid grid-cols-2 gap-3 mt-2">
                <div>
                  <label className="text-xs text-gray-600">Open:</label>
                  <input
                    type="time"
                    value={newHoliday.modifiedHours.open}
                    onChange={(e) => setNewHoliday({ 
                      ...newHoliday, 
                      modifiedHours: { ...newHoliday.modifiedHours, open: e.target.value }
                    })}
                    className="w-full h-8 text-sm px-2 border border-gray-300 rounded"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-600">Close:</label>
                  <input
                    type="time"
                    value={newHoliday.modifiedHours.close}
                    onChange={(e) => setNewHoliday({ 
                      ...newHoliday, 
                      modifiedHours: { ...newHoliday.modifiedHours, close: e.target.value }
                    })}
                    className="w-full h-8 text-sm px-2 border border-gray-300 rounded"
                  />
                </div>
              </div>
            </div>
          )}

          <button
            type="button"
            onClick={addHoliday}
            disabled={!newHoliday.name || !newHoliday.startDate}
            className="flex items-center gap-2 w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-md font-medium transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Holiday Period
          </button>
        </div>

        {/* Holiday List */}
        <div className="space-y-3">
          {formData.holidaySchedule.map((holiday, index) => {
            const startDate = new Date(holiday.startDate);
            const endDate = holiday.endDate ? new Date(holiday.endDate) : null;
            const isMultiDay = endDate && endDate.getTime() !== startDate.getTime();
            
            return (
              <div key={index} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h4 className="font-medium text-gray-900">{holiday.name}</h4>
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        holiday.type === 'closed' 
                          ? 'bg-red-100 text-red-800' 
                          : 'bg-blue-100 text-blue-800'
                      }`}>
                        {holiday.type === 'closed' ? 'Closed' : 'Modified Hours'}
                      </span>
                    </div>
                    
                    <div className="text-sm text-gray-600 space-y-1">
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
                  
                  <button
                    type="button"
                    onClick={() => removeHoliday(index)}
                    className="text-red-600 hover:text-red-800 p-1"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
          
          {formData.holidaySchedule.length === 0 && (
            <div className="text-center py-4 text-gray-500 text-sm">
              No holidays configured. Add holidays above to set special operating periods.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
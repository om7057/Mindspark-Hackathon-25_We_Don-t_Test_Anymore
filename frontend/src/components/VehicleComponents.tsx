import React from 'react';
import type { Vehicle, Color } from '../types';
import { COLOR_CODES } from '../types';

interface VehicleComponentProps {
  vehicle: Vehicle;
  size?: 'sm' | 'md' | 'lg';
  showId?: boolean;
}

export const VehicleComponent: React.FC<VehicleComponentProps> = ({ 
  vehicle, 
  size = 'md', 
  showId = false 
}) => {
  const sizeClasses = {
    sm: 'w-4 h-4 text-xs',
    md: 'w-6 h-6 text-sm',
    lg: 'w-8 h-8 text-base'
  };

  const backgroundColor = COLOR_CODES[vehicle.color as Color];

  return (
    <div 
      className={`${sizeClasses[size]} rounded-sm border border-gray-300 flex items-center justify-center font-bold text-white shadow-sm`}
      style={{ backgroundColor }}
      title={showId ? `${vehicle.id} - ${vehicle.color}` : vehicle.color}
    >
      {vehicle.color.replace('C', '')}
    </div>
  );
};

interface VehicleQueueProps {
  vehicles: Vehicle[];
  title: string;
  capacity?: number;
  isActive?: boolean;
  orientation?: 'horizontal' | 'vertical';
  maxDisplayCount?: number;
}

export const VehicleQueue: React.FC<VehicleQueueProps> = ({ 
  vehicles, 
  title, 
  capacity, 
  isActive = true,
  orientation = 'horizontal',
  maxDisplayCount = 10
}) => {
  const displayVehicles = vehicles.slice(0, maxDisplayCount);
  const hasMore = vehicles.length > maxDisplayCount;

  const containerClasses = orientation === 'horizontal' 
    ? 'flex flex-row gap-1 flex-wrap' 
    : 'flex flex-col gap-1';

  return (
    <div className={`p-3 border rounded-lg ${isActive ? 'bg-white' : 'bg-gray-100'}`}>
      <div className="flex justify-between items-center mb-2">
        <h4 className="text-sm font-semibold text-gray-700">{title}</h4>
        <div className="text-xs text-gray-500">
          {vehicles.length}{capacity ? `/${capacity}` : ''}
          {!isActive && ' (Inactive)'}
        </div>
      </div>
      
      <div className={containerClasses}>
        {displayVehicles.map((vehicle, index) => (
          <VehicleComponent 
            key={`${vehicle.id}-${index}`} 
            vehicle={vehicle} 
            size="sm" 
          />
        ))}
        {hasMore && (
          <div className="w-4 h-4 text-xs bg-gray-300 rounded-sm flex items-center justify-center text-gray-600">
            +{vehicles.length - maxDisplayCount}
          </div>
        )}
      </div>
      
      {capacity && (
        <div className="mt-2">
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className={`h-2 rounded-full ${
                vehicles.length / capacity > 0.8 ? 'bg-red-500' : 
                vehicles.length / capacity > 0.6 ? 'bg-yellow-500' : 'bg-green-500'
              }`}
              style={{ width: `${Math.min((vehicles.length / capacity) * 100, 100)}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
};
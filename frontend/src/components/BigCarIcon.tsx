import React from 'react';
import { FaCarSide } from 'react-icons/fa6';
import type { Color } from '../types';
import { COLOR_CODES } from '../types';

interface BigCarIconProps {
  color: Color;
  size?: 'small' | 'medium' | 'large' | 'xl';
  className?: string;
  animate?: boolean;
  isMoving?: boolean;
  processingProgress?: number;
}

const SIZE_CLASSES = {
  small: 'text-lg',
  medium: 'text-4xl',
  large: 'text-5xl',
  xl: 'text-6xl'
};

export const BigCarIcon: React.FC<BigCarIconProps> = ({ 
  color, 
  size = 'large', 
  className = '', 
  animate = false,
  isMoving = false,
  processingProgress = 0
}) => {
  const carColor = COLOR_CODES[color];
  const sizeClass = SIZE_CLASSES[size];
  
  return (
    <div className={`relative inline-flex items-center justify-center ${className}`}>
      {/* Processing indicator - minimal */}
      {processingProgress > 0 && (
        <div className="absolute -top-1 -left-1 w-3 h-3 bg-blue-500 rounded-full animate-pulse" />
      )}
      
      {/* Car Icon */}
      <FaCarSide 
        className={`${sizeClass} transition-all duration-200 ${
          animate ? 'hover:scale-105' : ''
        } ${isMoving ? 'opacity-80' : 'opacity-100'}`}
        style={{ 
          color: carColor,
          filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))'
        }}
      />
      
      {/* Color badge - minimal */}
      <div 
        className="absolute -top-1 -right-1 w-4 h-4 rounded-full border border-white text-[8px] font-semibold flex items-center justify-center font-['Inter']"
        style={{ 
          backgroundColor: carColor, 
          color: '#fff'
        }}
      >
        {color.replace('C', '')}
      </div>
    </div>
  );
};

interface VehicleDisplayProps {
  vehicles: Array<{ id: string; color: Color }>;
  title: string;
  maxDisplay?: number;
  showCount?: boolean;
  isMoving?: boolean;
}

export const VehicleDisplay: React.FC<VehicleDisplayProps> = ({ 
  vehicles, 
  title, 
  maxDisplay = 10,
  showCount = true,
  isMoving = false
}) => {
  const displayVehicles = vehicles.slice(0, maxDisplay);
  const remainingCount = vehicles.length - displayVehicles.length;
  
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h4 className="font-medium text-gray-700 font-['Inter']">
          {title}
        </h4>
        {showCount && (
          <span className="text-xs text-gray-500 font-['Inter'] bg-gray-100 px-2 py-1 rounded">
            {vehicles.length}
          </span>
        )}
      </div>
      
      <div className="flex flex-wrap gap-2 p-2 bg-gray-50 rounded min-h-[50px] items-center">
        {displayVehicles.length > 0 ? (
          <>
            {displayVehicles.map((vehicle) => (
              <BigCarIcon 
                key={vehicle.id}
                color={vehicle.color} 
                size="medium"
                animate={false}
                isMoving={isMoving}
              />
            ))}
            
            {remainingCount > 0 && (
              <div className="text-xs text-gray-500 font-['Inter'] bg-gray-200 px-2 py-1 rounded">
                +{remainingCount}
              </div>
            )}
          </>
        ) : (
          <div className="text-xs text-gray-400 font-['Inter'] py-2 w-full text-center">
            {title.includes('Input') ? 'No cars waiting' : 'Empty'}
          </div>
        )}
      </div>
    </div>
  );
};
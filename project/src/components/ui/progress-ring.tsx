import React from 'react';

interface ProgressRingProps {
  progress: number;
  size?: number;
  strokeWidth?: number;
  className?: string;
  color?: string;
}

export function ProgressRing({
  progress,
  size = 120,
  strokeWidth = 8,
  className = '',
  color = 'currentColor'
}: ProgressRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (progress / 100) * circumference;

  return (
    <svg
      className={`progress-ring ${className}`}
      width={size}
      height={size}
    >
      {/* Background circle */}
      <circle
        className="opacity-20"
        stroke={color}
        strokeWidth={strokeWidth}
        fill="none"
        r={radius}
        cx={size / 2}
        cy={size / 2}
      />
      {/* Progress circle */}
      <circle
        className="progress-ring-circle"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeDasharray={`${circumference} ${circumference}`}
        strokeDashoffset={offset}
        strokeLinecap="round"
        fill="none"
        r={radius}
        cx={size / 2}
        cy={size / 2}
      />
    </svg>
  );
}
import React from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

interface ActivityData {
  name: string;
  value: number;
}

interface ActivityChartProps {
  data: ActivityData[];
  className?: string;
}

export function ActivityChart({ data, className = '' }: ActivityChartProps) {
  return (
    <div className={`h-[200px] ${className}`}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data}>
          <defs>
            <linearGradient id="colorActivity" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="rgb(59, 130, 246)" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="rgb(59, 130, 246)" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <XAxis 
            dataKey="name" 
            stroke="#6B7280"
            fontSize={12}
            tickLine={false}
            axisLine={false}
          />
          <YAxis 
            stroke="#6B7280"
            fontSize={12}
            tickLine={false}
            axisLine={false}
            tickFormatter={(value) => `${value}%`}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'rgba(17, 24, 39, 0.8)',
              border: 'none',
              borderRadius: '0.5rem',
              padding: '0.5rem',
            }}
            itemStyle={{ color: '#E5E7EB' }}
            labelStyle={{ color: '#9CA3AF' }}
          />
          <Area
            type="monotone"
            dataKey="value"
            stroke="rgb(59, 130, 246)"
            fillOpacity={1}
            fill="url(#colorActivity)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
'use client';
import { useMemo } from 'react';
import { reportMetrics } from '../utils/reportMetrics';

export function useReportMetrics(data) {
  return useMemo(() => reportMetrics(data.orders, data.transfers), [data.orders, data.transfers]);
}

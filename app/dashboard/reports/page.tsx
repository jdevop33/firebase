import React from "react";
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import { FileText, Loader2, Plus, Download, Eye, MoreHorizontal, ArrowUpDown } from 'lucide-react';
import { format } from 'date-fns';

interface Report {
  id: string;
  reportType: string;
  status: string;
  createdAt: string;
  assetId: string;
  content: {
    title: string;
  };
}

type SortField = 'createdAt' | 'reportType' | 'status';
type SortOrder = 'asc' | 'desc';

export default function ReportsPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [selectedAsset, setSelectedAsset] = useState('');
  const [reportType, setReportType] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [showNewReport, setShowNewReport] = useState(false);
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sortField, setSortField] = useState<SortField>('createdAt');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const { toast } = useToast();
  const router = useRouter();

  useEffect(() => {
    const fetchReports = async () => {
      try {
        const response = await fetch('/api/reports');
        if (!response.ok) throw new Error('Failed to fetch reports');
        const data = await response.json();
        setReports(data);
      } catch (error) {
        console.error('Error fetching reports:', error);
        toast({
          title: 'Error',
          description: 'Failed to load reports',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };

    const fetchAssets = async () => {
      try {
        const response = await fetch('/api/assets');
        if (!response.ok) throw new Error('Failed to fetch assets');
        const data = await response.json();
        setAssets(data.items);
      } catch (error) {
        console.error('Error fetching assets:', error);
      }
    };

    fetchReports();
    fetchAssets();
  }, [toast]);

  const generateReport = async () => {
    if (!selectedAsset || !reportType) {
      toast({
        title: 'Error',
        description: 'Please select an asset and report type',
        variant: 'destructive',
      });
      return;
    }

    setIsGenerating(true);

    try {
      const response = await fetch(
        `/api/reports/generate/${selectedAsset}?report_type=${reportType}`,
        {
          method: 'POST',
        }
      );

      if (!response.ok) {
        throw new Error('Failed to generate report');
      }

      const data = await response.json();

      toast({
        title: 'Success',
        description: 'Report generated successfully',
      });

      // Refresh reports list
      const reportsResponse = await fetch('/api/reports');
      const reportsData = await reportsResponse.json();
      setReports(reportsData);

      // Reset form
      setSelectedAsset('');
      setReportType('');
      setShowNewReport(false);

      // Navigate to the report viewer
      router.push(`/dashboard/reports/${data.id}`);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to generate report',
        variant: 'destructive',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleExportPDF = async (reportId: string) => {
    try {
      const response = await fetch(`/api/reports/${reportId}/pdf`, {
        method: 'GET',
      });

      if (!response.ok) throw new Error('Failed to export PDF');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `report-${reportId}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: 'Success',
        description: 'Report downloaded successfully',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to export PDF',
        variant: 'destructive',
      });
    }
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const filteredAndSortedReports = reports
    .filter((report) => {
      const matchesSearch =
        report.content.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        report.reportType.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = !statusFilter || report.status === statusFilter;
      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      const order = sortOrder === 'asc' ? 1 : -1;
      if (sortField === 'createdAt') {
        return (new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()) * order;
      }
      return (a[sortField] > b[sortField] ? 1 : -1) * order;
    });

  return (
    <div className="container mx-auto py-8">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-3xl font-bold">Compliance Reports</h1>
        <Button onClick={() => setShowNewReport(!showNewReport)}>
          <Plus className="mr-2 size-4" />
          New Report
        </Button>
      </div>

      {showNewReport && (
        <Card className="mb-8 p-6">
          <div className="space-y-6">
            <div>
              <label className="mb-2 block text-sm font-medium">Asset</label>
              <Select onValueChange={setSelectedAsset} value={selectedAsset}>
                <SelectTrigger>
                  <SelectValue placeholder="Select an asset" />
                </SelectTrigger>
                <SelectContent>
                  {assets.map((asset: any) => (
                    <SelectItem key={asset.id} value={asset.id}>
                      {asset.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">Report Type</label>
              <Select onValueChange={setReportType} value={reportType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select report type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="POLICY">Policy Report</SelectItem>
                  <SelectItem value="STRATEGY">Strategy Report</SelectItem>
                  <SelectItem value="FINANCIAL">Financial Planning Report</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button onClick={generateReport} disabled={isGenerating} className="w-full">
              {isGenerating ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Generating Report...
                </>
              ) : (
                <>
                  <FileText className="mr-2 size-4" />
                  Generate Report
                </>
              )}
            </Button>
          </div>
        </Card>
      )}

      <div className="mb-6 flex gap-4">
        <div className="flex-1">
          <Input
            placeholder="Search reports..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-sm"
          />
        </div>
        <Select onValueChange={setStatusFilter} value={statusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">All Statuses</SelectItem>
            <SelectItem value="COMPLETED">Completed</SelectItem>
            <SelectItem value="PENDING">Pending</SelectItem>
            <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Report Title</TableHead>
              <TableHead>
                <Button variant="ghost" onClick={() => handleSort('reportType')}>
                  Type
                  <ArrowUpDown className="ml-2 size-4" />
                </Button>
              </TableHead>
              <TableHead>
                <Button variant="ghost" onClick={() => handleSort('status')}>
                  Status
                  <ArrowUpDown className="ml-2 size-4" />
                </Button>
              </TableHead>
              <TableHead>
                <Button variant="ghost" onClick={() => handleSort('createdAt')}>
                  Generated
                  <ArrowUpDown className="ml-2 size-4" />
                </Button>
              </TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} className="py-8 text-center">
                  <Loader2 className="mx-auto size-6 animate-spin" />
                </TableCell>
              </TableRow>
            ) : filteredAndSortedReports.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                  No reports found
                </TableCell>
              </TableRow>
            ) : (
              filteredAndSortedReports.map((report) => (
                <TableRow key={report.id}>
                  <TableCell className="font-medium">{report.content.title}</TableCell>
                  <TableCell>{report.reportType}</TableCell>
                  <TableCell>
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        report.status === 'COMPLETED'
                          ? 'bg-green-100 text-green-800'
                          : report.status === 'PENDING'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {report.status}
                    </span>
                  </TableCell>
                  <TableCell>{format(new Date(report.createdAt), 'PPp')}</TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreHorizontal className="size-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => router.push(`/dashboard/reports/${report.id}`)}
                        >
                          <Eye className="mr-2 size-4" />
                          View Report
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleExportPDF(report.id)}>
                          <Download className="mr-2 size-4" />
                          Download PDF
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}

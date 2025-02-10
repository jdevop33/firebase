'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, Printer, Share } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { getReportPDFUrl } from '@/lib/firebase';

interface ReportSection {
  heading: string;
  content: string;
}

interface Report {
  id: string;
  content: {
    title: string;
    sections: ReportSection[];
  };
  status: string;
  generated_at: string;
  pdfUrl?: string;
}

export default function ReportViewerPage() {
  const params = useParams();
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const fetchReport = async () => {
      try {
        const response = await fetch(`/api/reports/${params.id}`);
        if (!response.ok) throw new Error('Failed to fetch report');
        const data = await response.json();
        setReport(data);
      } catch (error) {
        console.error('Error fetching report:', error);
        toast({
          title: 'Error',
          description: 'Failed to load report',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };

    fetchReport();
  }, [params.id, toast]);

  const handleDownload = async () => {
    if (!report) return;

    try {
      setDownloading(true);
      let pdfUrl = report.pdfUrl;

      if (!pdfUrl) {
        // Generate new PDF if URL doesn't exist
        const response = await fetch(`/api/reports/${report.id}/pdf`);
        if (!response.ok) throw new Error('Failed to generate PDF');

        const blob = await response.blob();
        pdfUrl = URL.createObjectURL(blob);
      } else {
        // Get URL from Firebase Storage
        pdfUrl = await getReportPDFUrl(report.id);
      }

      const a = document.createElement('a');
      a.href = pdfUrl;
      a.download = `${report.content.title.toLowerCase().replace(/\s+/g, '-')}-${report.id}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      toast({
        title: 'Success',
        description: 'Report downloaded successfully',
      });
    } catch (error) {
      console.error('Error downloading PDF:', error);
      toast({
        title: 'Error',
        description: 'Failed to download report',
        variant: 'destructive',
      });
    } finally {
      setDownloading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleShare = async () => {
    if (!report) return;

    try {
      const shareData = {
        title: report.content.title,
        text: 'Check out this compliance report',
        url: window.location.href,
      };

      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(window.location.href);
        toast({
          title: 'Link copied',
          description: 'Report URL has been copied to clipboard',
        });
      }
    } catch (error) {
      console.error('Error sharing:', error);
      toast({
        title: 'Error',
        description: 'Failed to share report',
        variant: 'destructive',
      });
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto py-8">
        <div className="space-y-6">
          <Skeleton className="h-8 w-1/4" />
          <Skeleton className="h-96" />
        </div>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="container mx-auto py-8">
        <h1 className="mb-8 text-3xl font-bold">Report Not Found</h1>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-3xl font-bold">{report.content.title}</h1>
        <div className="space-x-4">
          <Button onClick={handleShare} variant="outline">
            <Share className="mr-2 size-4" />
            Share
          </Button>
          <Button onClick={handleDownload} variant="outline" disabled={downloading}>
            <Download className="mr-2 size-4" />
            {downloading ? 'Downloading...' : 'Download PDF'}
          </Button>
          <Button onClick={handlePrint} variant="outline">
            <Printer className="mr-2 size-4" />
            Print
          </Button>
        </div>
      </div>

      <Card className="p-8">
        <div className="prose max-w-none">
          <div className="mb-6">
            <p className="text-sm text-muted-foreground">
              Generated on: {new Date(report.generated_at).toLocaleString()}
            </p>
          </div>

          <div className="space-y-8">
            {report.content.sections.map((section, index) => (
              <div key={index} className="space-y-4">
                <h2 className="text-2xl font-semibold">{section.heading}</h2>
                <div className="whitespace-pre-wrap text-gray-700 dark:text-gray-300">
                  {section.content}
                </div>
              </div>
            ))}
          </div>
        </div>
      </Card>
    </div>
  );
}

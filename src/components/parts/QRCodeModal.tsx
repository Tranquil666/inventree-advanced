'use client'

import { useEffect, useState } from 'react'
import QRCode from 'qrcode'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Download, Printer } from 'lucide-react'

interface QRCodeModalProps {
  partId: string
  partName: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function QRCodeModal({ partId, partName, open, onOpenChange }: QRCodeModalProps) {
  const [dataUrl, setDataUrl] = useState<string>('')

  const partUrl = `https://inventree-advanced.vercel.app/parts/${partId}`

  useEffect(() => {
    if (!open) return
    QRCode.toDataURL(partUrl, {
      width: 300,
      margin: 2,
      color: { dark: '#1e293b', light: '#ffffff' },
    }).then((url) => setDataUrl(url))
  }, [open, partUrl])

  const handleDownload = () => {
    if (!dataUrl) return
    const link = document.createElement('a')
    link.href = dataUrl
    link.download = `qr-${partName.replace(/\s+/g, '-').toLowerCase()}.png`
    link.click()
  }

  const handlePrint = () => {
    window.print()
  }

  return (
    <>
      <style>{`
        @media print {
          body > * { display: none !important; }
          .qr-print-content { display: flex !important; }
        }
      `}</style>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>QR Code Label</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center gap-4 py-4">
            <div className="qr-print-content flex flex-col items-center gap-3 p-6 border border-slate-200 rounded-xl bg-white">
              {dataUrl ? (
                <img src={dataUrl} alt={`QR code for ${partName}`} className="w-48 h-48" />
              ) : (
                <div className="w-48 h-48 bg-slate-100 rounded-lg animate-pulse" />
              )}
              <div className="text-center">
                <p className="font-semibold text-slate-900 text-sm">{partName}</p>
                <p className="text-xs text-slate-400 font-mono mt-0.5">{partId}</p>
              </div>
            </div>
            <div className="flex gap-2 w-full">
              <Button
                variant="outline"
                className="flex-1 gap-2"
                onClick={handlePrint}
              >
                <Printer className="w-4 h-4" />
                Print
              </Button>
              <Button
                className="flex-1 gap-2 bg-indigo-600 hover:bg-indigo-700"
                onClick={handleDownload}
                disabled={!dataUrl}
              >
                <Download className="w-4 h-4" />
                Download PNG
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

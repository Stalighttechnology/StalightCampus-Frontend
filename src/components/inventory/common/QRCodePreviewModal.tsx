import React, { useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../../ui/dialog";
import { Button } from "../../ui/button";
import { QRCodeSVG } from "qrcode.react";
import { Printer, Download, QrCode } from "lucide-react";
import { InventoryItem } from "../../../utils/inventory_api";

interface Props {
  item: InventoryItem | null;
  isOpen: boolean;
  onClose: () => void;
  institutionName?: string;
}

export const QRCodePreviewModal: React.FC<Props> = ({
  item,
  isOpen,
  onClose,
  institutionName = "STALIGHT CAMPUS",
}) => {
  const printAreaRef = useRef<HTMLDivElement>(null);

  if (!item) return null;

  const qrValue = `STALIGHT-ASSET:${item.item_code}|ORG:${item.category_details?.name || ''}|ID:${item.id}|NAME:${item.item_name}`;

  const handlePrint = () => {
    const printContent = printAreaRef.current;
    if (!printContent) return;

    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    printWindow.document.write(`
      <html>
        <head>
          <title>Print Asset Badge - ${item.item_code}</title>
          <style>
            body { font-family: 'Inter', sans-serif; display: flex; justify-content: center; align-items: center; min-height: 100vh; margin: 0; }
            .badge-card { border: 2px solid #000; border-radius: 12px; padding: 20px; width: 300px; text-align: center; }
            .inst-name { font-size: 13px; font-weight: 700; letter-spacing: 1px; color: #555; text-transform: uppercase; margin-bottom: 8px; }
            .item-code { font-size: 20px; font-weight: 800; font-family: monospace; letter-spacing: 2px; margin: 10px 0 4px 0; }
            .item-name { font-size: 14px; font-weight: 600; color: #222; margin-bottom: 6px; }
            .meta { font-size: 11px; color: #666; margin-top: 4px; }
          </style>
        </head>
        <body onload="window.print(); window.close();">
          <div class="badge-card">
            ${printContent.innerHTML}
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md p-6">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg font-bold">
            <QrCode className="w-5 h-5 text-primary" />
            Printable Asset Badge
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col items-center justify-center p-4">
          <div
            ref={printAreaRef}
            className="w-full max-w-[280px] bg-white text-black p-6 rounded-2xl border-2 border-black/10 shadow-lg text-center flex flex-col items-center"
          >
            <p className="text-[11px] font-extrabold uppercase tracking-widest text-gray-500 mb-2">
              {institutionName}
            </p>

            <div className="p-3 bg-white border rounded-xl shadow-inner my-2">
              <QRCodeSVG
                value={qrValue}
                size={160}
                level="H"
                includeMargin={false}
              />
            </div>

            <p className="font-mono text-lg font-black tracking-wider text-black mt-2">
              {item.item_code}
            </p>
            <p className="text-xs font-semibold text-gray-800 line-clamp-1">
              {item.item_name}
            </p>
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-2">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          <Button onClick={handlePrint} className="gap-1.5">
            <Printer className="w-4 h-4" /> Print Badge
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

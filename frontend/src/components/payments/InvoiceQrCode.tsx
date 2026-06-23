import { useEffect, useState } from "react";
import QRCode from "qrcode";

type InvoiceQrCodeProps = {
    pageUrl: string;
    label: string;
    size?: number;
};

export default function InvoiceQrCode({ pageUrl, label, size = 160 }: InvoiceQrCodeProps) {
    const [dataUrl, setDataUrl] = useState<string | null>(null);
    const [error, setError] = useState(false);

    useEffect(() => {
        let cancelled = false;

        setDataUrl(null);
        setError(false);

        void QRCode.toDataURL(pageUrl, {
            width: size,
            margin: 1,
            errorCorrectionLevel: "M",
        })
            .then((url) => {
                if (!cancelled) {
                    setDataUrl(url);
                }
            })
            .catch(() => {
                if (!cancelled) {
                    setError(true);
                }
            });

        return () => {
            cancelled = true;
        };
    }, [pageUrl, size]);

    if (error) {
        return <p className="profile-admin-invoice-qr-error">Не вдалося згенерувати QR-код.</p>;
    }

    if (!dataUrl) {
        return <p className="profile-admin-invoice-qr-loading">Генеруємо QR…</p>;
    }

    return (
        <img
            src={dataUrl}
            width={size}
            height={size}
            alt={`QR-код для ${label}`}
            className="profile-admin-invoice-qr"
        />
    );
}

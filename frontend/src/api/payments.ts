export type CreateMonoInvoiceRequest = {
    amountKopiyky: number;
    destination: string;
    reference?: string;
};

export type CreateMonoInvoiceResponse = {
    success: boolean;
    invoiceId?: string;
    pageUrl?: string;
    reference?: string;
    error?: string;
};

export async function createMonoInvoice(
    payload: CreateMonoInvoiceRequest,
): Promise<CreateMonoInvoiceResponse> {
    const response = await fetch("/api/payments/mono/invoice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            amount: payload.amountKopiyky,
            destination: payload.destination,
            reference: payload.reference,
        }),
    });

    const data = (await response.json()) as CreateMonoInvoiceResponse;

    if (!response.ok && data.success !== false) {
        return {
            success: false,
            error: "Не вдалося створити рахунок Monobank.",
        };
    }

    return data;
}

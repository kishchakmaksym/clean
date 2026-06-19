import StreetAddressInput from "../address/StreetAddressInput";
import type { UserAddressDto } from "../../api/profile";

type OrderAddressSelectorProps = {
    addresses: UserAddressDto[];
    selection: string;
    onSelectionChange: (value: string) => void;
    customAddress: string;
    onCustomAddressChange: (value: string) => void;
    loading?: boolean;
};

export default function OrderAddressSelector({
    addresses,
    selection,
    onSelectionChange,
    customAddress,
    onCustomAddressChange,
    loading = false,
}: OrderAddressSelectorProps) {
    const showCustomField = selection === "new" || addresses.length === 0;

    return (
        <fieldset className="services-address-fieldset" disabled={loading}>
            <legend>Адреса прибирання</legend>

            {addresses.length > 0 ? (
                <div className="services-address-options">
                    {addresses.map((address) => {
                        const label = address.label?.trim();
                        const title = label ? `${label} — ${address.addressLine}` : address.addressLine;

                        return (
                            <label
                                key={address.id}
                                className={`services-address-option${selection === address.id ? " services-address-option--on" : ""}`}
                            >
                                <input
                                    type="radio"
                                    name="order-address"
                                    value={address.id}
                                    checked={selection === address.id}
                                    onChange={() => onSelectionChange(address.id)}
                                />
                                <span className="services-address-option-copy">
                                    <span className="services-address-option-title">{title}</span>
                                    {address.isLastUsed ? (
                                        <span className="services-address-option-badge">остання</span>
                                    ) : null}
                                </span>
                            </label>
                        );
                    })}

                    <label
                        className={`services-address-option${selection === "new" ? " services-address-option--on" : ""}`}
                    >
                        <input
                            type="radio"
                            name="order-address"
                            value="new"
                            checked={selection === "new"}
                            onChange={() => onSelectionChange("new")}
                        />
                        <span className="services-address-option-copy">
                            <span className="services-address-option-title">Інша адреса</span>
                        </span>
                    </label>
                </div>
            ) : (
                <p className="services-address-hint">
                    Збережених адрес ще немає. Вкажіть адресу — вона автоматично з&apos;явиться у вашому профілі.
                </p>
            )}

            {showCustomField ? (
                <div className="services-field services-address-custom">
                    <span className="services-address-custom-label">
                        {addresses.length > 0 ? "Нова адреса" : "Адреса"}
                    </span>
                    <StreetAddressInput
                        value={customAddress}
                        onChange={onCustomAddressChange}
                        disabled={loading}
                    />
                </div>
            ) : null}
        </fieldset>
    );
}

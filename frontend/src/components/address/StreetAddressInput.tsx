import { useEffect, useId, useMemo, useRef, useState } from "react";

import { searchStreets as fetchStreetSuggestions } from "../../api/streets";
import { SERVICE_SETTLEMENTS, type ServiceSettlementId } from "../../data/serviceAreaStreets";
import {
    buildServiceAreaAddress,
    parseServiceAreaAddress,
} from "../../utils/serviceAreaAddress";

import "./StreetAddressInput.css";

type StreetAddressInputProps = {
    value: string;
    onChange: (value: string) => void;
    disabled?: boolean;
    id?: string;
};

export default function StreetAddressInput({
    value,
    onChange,
    disabled = false,
    id,
}: StreetAddressInputProps) {
    const listId = useId();
    const rootRef = useRef<HTMLDivElement>(null);
    const parsed = useMemo(() => parseServiceAreaAddress(value), [value]);

    const [settlementId, setSettlementId] = useState<ServiceSettlementId>(
        parsed.settlementId ?? "uzhhorod",
    );
    const [streetQuery, setStreetQuery] = useState(parsed.street);
    const [selectedStreet, setSelectedStreet] = useState(parsed.street);
    const [building, setBuilding] = useState(parsed.building);
    const [apartment, setApartment] = useState(parsed.apartment);
    const [isOpen, setIsOpen] = useState(false);
    const [activeIndex, setActiveIndex] = useState(-1);
    const [suggestions, setSuggestions] = useState<string[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [searchError, setSearchError] = useState("");

    useEffect(() => {
        if (!value.trim()) {
            return;
        }

        const next = parseServiceAreaAddress(value);
        setSettlementId(next.settlementId ?? "uzhhorod");
        setStreetQuery(next.street);
        setSelectedStreet(next.street);
        setBuilding(next.building);
        setApartment(next.apartment);
    }, [value]);

    useEffect(() => {
        if (streetQuery.trim().length < 1) {
            setSuggestions([]);
            setIsSearching(false);
            setSearchError("");
            return;
        }

        let cancelled = false;
        setIsSearching(true);
        setSearchError("");

        const timer = window.setTimeout(() => {
            void fetchStreetSuggestions(settlementId, streetQuery)
                .then((streets) => {
                    if (!cancelled) {
                        setSuggestions(streets);
                    }
                })
                .catch((error: unknown) => {
                    if (!cancelled) {
                        setSuggestions([]);
                        setSearchError(
                            error instanceof Error
                                ? error.message
                                : "Не вдалося завантажити підказки вулиць.",
                        );
                    }
                })
                .finally(() => {
                    if (!cancelled) {
                        setIsSearching(false);
                    }
                });
        }, 280);

        return () => {
            cancelled = true;
            window.clearTimeout(timer);
        };
    }, [settlementId, streetQuery]);

    useEffect(() => {
        function handlePointerDown(event: MouseEvent) {
            if (!rootRef.current?.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }

        document.addEventListener("mousedown", handlePointerDown);
        return () => document.removeEventListener("mousedown", handlePointerDown);
    }, []);

    function resolveStreet(query: string, picked: string, available: string[]): string | null {
        if (picked.trim()) {
            return picked.trim();
        }

        const trimmedQuery = query.trim();
        if (!trimmedQuery) {
            return null;
        }

        const exact = available.find(
            (street) => street.localeCompare(trimmedQuery, "uk", { sensitivity: "accent" }) === 0,
        );
        if (exact) {
            return exact;
        }

        const normalizedQuery = trimmedQuery.toLocaleLowerCase("uk-UA");
        return (
            available.find((street) => {
                const normalizedStreet = street.toLocaleLowerCase("uk-UA");
                if (normalizedStreet.startsWith(normalizedQuery)) {
                    return true;
                }

                return normalizedStreet
                    .split(/[\s·-]+/)
                    .some((word) => word.startsWith(normalizedQuery));
            }) ?? null
        );
    }

    function emitAddress(
        nextSettlementId: ServiceSettlementId,
        nextStreet: string,
        nextBuilding: string,
        nextApartment: string,
        pickedStreet = selectedStreet,
        availableStreets = suggestions,
    ) {
        const street = resolveStreet(nextStreet, pickedStreet, availableStreets);
        const house = nextBuilding.trim();

        if (!street || !house) {
            onChange("");
            return;
        }

        onChange(
            buildServiceAreaAddress({
                settlementId: nextSettlementId,
                street,
                building: house,
                apartment: nextApartment.trim() || undefined,
            }),
        );
    }

    function selectStreet(street: string) {
        setSelectedStreet(street);
        setStreetQuery(street);
        setIsOpen(false);
        setActiveIndex(-1);
        emitAddress(settlementId, street, building, apartment, street, [street]);
    }

    function handleSettlementChange(nextSettlementId: ServiceSettlementId) {
        setSettlementId(nextSettlementId);
        setStreetQuery("");
        setSelectedStreet("");
        setSuggestions([]);
        setActiveIndex(-1);
        onChange("");
    }

    function handleStreetChange(nextQuery: string) {
        setStreetQuery(nextQuery);
        setSelectedStreet("");
        setActiveIndex(-1);
        setIsOpen(true);
        emitAddress(settlementId, nextQuery, building, apartment, "");
    }

    function handleBuildingChange(nextBuilding: string) {
        setBuilding(nextBuilding);
        emitAddress(settlementId, streetQuery, nextBuilding, apartment);
    }

    function handleApartmentChange(nextApartment: string) {
        setApartment(nextApartment);
        emitAddress(settlementId, streetQuery, building, nextApartment);
    }

    function handleStreetKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
        if (!isOpen || suggestions.length === 0) {
            return;
        }

        if (event.key === "ArrowDown") {
            event.preventDefault();
            setActiveIndex((current) => (current + 1) % suggestions.length);
            return;
        }

        if (event.key === "ArrowUp") {
            event.preventDefault();
            setActiveIndex((current) => (current <= 0 ? suggestions.length - 1 : current - 1));
            return;
        }

        if (event.key === "Enter" && activeIndex >= 0) {
            event.preventDefault();
            selectStreet(suggestions[activeIndex]!);
            return;
        }

        if (event.key === "Escape") {
            setIsOpen(false);
            setActiveIndex(-1);
        }
    }

    const showSuggestions = isOpen && streetQuery.trim().length > 0;

    return (
        <div className="street-address-input" ref={rootRef} id={id}>
            <div className="street-address-settlements" role="tablist" aria-label="Населений пункт">
                {SERVICE_SETTLEMENTS.map((settlement) => (
                    <button
                        key={settlement.id}
                        type="button"
                        role="tab"
                        aria-selected={settlementId === settlement.id}
                        className={`street-address-settlement${settlementId === settlement.id ? " street-address-settlement--active" : ""}`}
                        onClick={() => handleSettlementChange(settlement.id)}
                        disabled={disabled}
                    >
                        {settlement.shortName}
                    </button>
                ))}
            </div>

            <div className="street-address-fields">
                <label className="street-address-field street-address-field--street">
                    <span>Вулиця</span>
                    <div className="street-address-combobox">
                        <input
                            type="text"
                            role="combobox"
                            aria-expanded={showSuggestions}
                            aria-controls={listId}
                            aria-autocomplete="list"
                            placeholder="Почніть вводити назву вулиці…"
                            value={streetQuery}
                            onChange={(event) => handleStreetChange(event.target.value)}
                            onFocus={() => setIsOpen(true)}
                            onKeyDown={handleStreetKeyDown}
                            disabled={disabled}
                            autoComplete="off"
                        />
                        {showSuggestions ? (
                            <ul className="street-address-suggestions" id={listId} role="listbox">
                                {searchError ? (
                                    <li className="street-address-suggestion-status street-address-suggestion-status--error">
                                        {searchError}
                                    </li>
                                ) : null}
                                {isSearching && suggestions.length === 0 && !searchError ? (
                                    <li className="street-address-suggestion-status">Пошук…</li>
                                ) : null}
                                {!isSearching && suggestions.length === 0 && !searchError && streetQuery.trim().length >= 2 ? (
                                    <li className="street-address-suggestion-status">
                                        Нічого не знайдено — уточніть назву або перевірте населений пункт
                                    </li>
                                ) : null}
                                {suggestions.map((street, index) => (
                                    <li key={street} role="option" aria-selected={activeIndex === index}>
                                        <button
                                            type="button"
                                            className={`street-address-suggestion${activeIndex === index ? " street-address-suggestion--active" : ""}`}
                                            onMouseDown={(event) => event.preventDefault()}
                                            onClick={() => selectStreet(street)}
                                        >
                                            {street}
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        ) : null}
                    </div>
                </label>

                <label className="street-address-field street-address-field--building">
                    <span>Будинок</span>
                    <input
                        type="text"
                        inputMode="text"
                        placeholder="22"
                        value={building}
                        onChange={(event) => handleBuildingChange(event.target.value)}
                        disabled={disabled}
                        autoComplete="off"
                    />
                </label>

                <label className="street-address-field street-address-field--apartment">
                    <span>Квартира</span>
                    <input
                        type="text"
                        inputMode="text"
                        placeholder="необовʼязково"
                        value={apartment}
                        onChange={(event) => handleApartmentChange(event.target.value)}
                        disabled={disabled}
                        autoComplete="off"
                    />
                </label>
            </div>

            <p className="street-address-hint">
                Підказки з OpenStreetMap — усі вулиці Ужгорода, Минаю та Сторожниці, включно з новими.
            </p>
        </div>
    );
}

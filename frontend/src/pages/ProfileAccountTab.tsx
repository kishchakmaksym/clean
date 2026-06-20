import { useCallback, useEffect, useState } from "react";

import {
    addProfileAddress,
    deleteProfileAddress,
    fetchProfile,
    updateProfile,
    updateProfileAddress,
    type UserAddressDto,
    type UserProfileDto,
} from "../api/profile";
import type { UserDto } from "../api/types";
import StreetAddressInput from "../components/address/StreetAddressInput";
import { formatUkrainianShortDate } from "../utils/dateTime";
import { validateServiceAreaAddress } from "../utils/serviceAreaAddress";

type ProfileAccountTabProps = {
    user: UserDto;
    onProfileSaved: (profile: UserProfileDto) => void;
    onLogout: () => void;
};

type AddressDraft = {
    label: string;
    addressLine: string;
};

const emptyAddressDraft = (): AddressDraft => ({
    label: "",
    addressLine: "",
});

const ADDRESSES_PREVIEW_COUNT = 4;

function AddressPinIcon() {
    return (
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="profile-address-pin">
            <path
                d="M12 21s6-5.2 6-10a6 6 0 10-12 0c0 4.8 6 10 6 10z"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
            <circle cx="12" cy="11" r="2.25" stroke="currentColor" strokeWidth="1.75" />
        </svg>
    );
}

export default function ProfileAccountTab({ user, onProfileSaved, onLogout }: ProfileAccountTabProps) {
    const isClient = user.role === "User";

    const [profile, setProfile] = useState<UserProfileDto | null>(null);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState("");

    const [name, setName] = useState(user.name);
    const [email, setEmail] = useState(user.email);
    const [phone, setPhone] = useState(user.phone);
    const [profileError, setProfileError] = useState("");
    const [isSavingProfile, setIsSavingProfile] = useState(false);
    const [isEditingProfile, setIsEditingProfile] = useState(false);

    const [addressDraft, setAddressDraft] = useState<AddressDraft>(emptyAddressDraft);
    const [editingAddressId, setEditingAddressId] = useState<string | null>(null);
    const [showAddressForm, setShowAddressForm] = useState(false);
    const [addressMessage, setAddressMessage] = useState("");
    const [addressError, setAddressError] = useState("");
    const [isSavingAddress, setIsSavingAddress] = useState(false);
    const [showAllAddresses, setShowAllAddresses] = useState(false);

    const reloadProfile = useCallback(async () => {
        setLoading(true);
        setLoadError("");

        try {
            const result = await fetchProfile(user.id);

            if (!result.success || !result.profile) {
                setLoadError(result.errors?.[0] ?? "Не вдалося завантажити профіль.");
                return;
            }

            setProfile(result.profile);
            setName(result.profile.name);
            setEmail(result.profile.email);
            setPhone(result.profile.phone);
        } catch {
            setLoadError("Помилка з'єднання з сервером.");
        } finally {
            setLoading(false);
        }
    }, [user.id]);

    useEffect(() => {
        void reloadProfile();
    }, [reloadProfile]);

    function resetAddressForm() {
        setAddressDraft(emptyAddressDraft());
        setEditingAddressId(null);
        setShowAddressForm(false);
        setAddressError("");
    }

    function startProfileEdit() {
        setProfileError("");
        setIsEditingProfile(true);
    }

    function cancelProfileEdit() {
        if (profile) {
            setName(profile.name);
            setEmail(profile.email);
            setPhone(profile.phone);
        }

        setProfileError("");
        setIsEditingProfile(false);
    }

    function startAddAddress() {
        setEditingAddressId(null);
        setAddressDraft(emptyAddressDraft());
        setShowAddressForm(true);
        setAddressMessage("");
        setAddressError("");
    }

    function startEditAddress(address: UserAddressDto) {
        setEditingAddressId(address.id);
        setAddressDraft({
            label: address.label ?? "",
            addressLine: address.addressLine,
        });
        setShowAddressForm(true);
        setAddressMessage("");
        setAddressError("");
    }

    async function handleSaveProfile(event: React.FormEvent) {
        event.preventDefault();
        if (!isEditingProfile) {
            return;
        }

        setProfileError("");
        setIsSavingProfile(true);

        try {
            const result = await updateProfile({
                userId: user.id,
                name: name.trim(),
                email: email.trim(),
                phone: phone.trim(),
            });

            if (!result.success || !result.profile) {
                setProfileError(result.errors?.[0] ?? "Не вдалося зберегти профіль.");
                return;
            }

            setProfile(result.profile);
            setName(result.profile.name);
            setEmail(result.profile.email);
            setPhone(result.profile.phone);
            onProfileSaved(result.profile);
            setIsEditingProfile(false);
        } catch {
            setProfileError("Помилка з'єднання з сервером.");
        } finally {
            setIsSavingProfile(false);
        }
    }

    async function handleSaveAddress(event: React.FormEvent) {
        event.preventDefault();
        setAddressMessage("");
        setAddressError("");

        const validationError = validateServiceAreaAddress(addressDraft.addressLine);
        if (validationError) {
            setAddressError(validationError);
            return;
        }

        setIsSavingAddress(true);

        const payload = {
            userId: user.id,
            label: addressDraft.label.trim() || undefined,
            addressLine: addressDraft.addressLine.trim(),
        };

        try {
            const result = editingAddressId
                ? await updateProfileAddress({
                      ...payload,
                      addressId: editingAddressId,
                  })
                : await addProfileAddress(payload);

            if (!result.success) {
                setAddressError(result.errors?.[0] ?? "Не вдалося зберегти адресу.");
                return;
            }

            setAddressMessage(result.message ?? "Адресу збережено.");
            resetAddressForm();
            await reloadProfile();
        } catch {
            setAddressError("Помилка з'єднання з сервером.");
        } finally {
            setIsSavingAddress(false);
        }
    }

    async function handleDeleteAddress(addressId: string) {
        setAddressMessage("");
        setAddressError("");
        setIsSavingAddress(true);

        try {
            const result = await deleteProfileAddress({ userId: user.id, addressId });

            if (!result.success) {
                setAddressError(result.errors?.[0] ?? "Не вдалося видалити адресу.");
                return;
            }

            if (editingAddressId === addressId) {
                resetAddressForm();
            }

            setAddressMessage(result.message ?? "Адресу видалено.");
            await reloadProfile();
        } catch {
            setAddressError("Помилка з'єднання з сервером.");
        } finally {
            setIsSavingAddress(false);
        }
    }

    if (loading) {
        return (
            <section className="profile-account-card hero-panel">
                <p className="profile-account-status">Завантаження профілю…</p>
            </section>
        );
    }

    if (loadError) {
        return (
            <section className="profile-account-card hero-panel">
                <p className="profile-account-error" role="alert">
                    {loadError}
                </p>
                <button type="button" className="secondary-button" onClick={() => void reloadProfile()}>
                    Спробувати знову
                </button>
                <div className="profile-account-footer profile-account-footer--actions-only">
                    <button type="button" className="profile-logout-button" onClick={onLogout}>
                        Вийти
                    </button>
                </div>
            </section>
        );
    }

    if (!isClient) {
        return (
            <section className="profile-account-card hero-panel">
                <h2 className="profile-sidebar-title">Контактні дані</h2>
                <ul className="profile-info-list">
                    <li className="profile-info-item">
                        <span className="profile-info-label">Ім&apos;я</span>
                        <span className="profile-info-value">{user.name}</span>
                    </li>
                    <li className="profile-info-item">
                        <span className="profile-info-label">Телефон</span>
                        <span className="profile-info-value">{user.phone}</span>
                    </li>
                    <li className="profile-info-item">
                        <span className="profile-info-label">Електронна пошта</span>
                        <span className="profile-info-value">{user.email}</span>
                    </li>
                </ul>
                <div className="profile-account-footer profile-account-footer--actions-only">
                    <button type="button" className="profile-logout-button" onClick={onLogout}>
                        Вийти
                    </button>
                </div>
            </section>
        );
    }

    return (
        <div className="profile-account-stack">
            <section className="profile-account-card hero-panel">
                <h2 className="profile-sidebar-title">Особисті дані</h2>

                {profileError ? (
                    <p className="profile-account-error" role="alert">
                        {profileError}
                    </p>
                ) : null}

                <div className="profile-form">
                    {isEditingProfile ? (
                        <form className="profile-form-edit" onSubmit={handleSaveProfile}>
                            <label>
                                <span>Ім&apos;я</span>
                                <input
                                    type="text"
                                    value={name}
                                    onChange={(event) => setName(event.target.value)}
                                    autoComplete="name"
                                    required
                                />
                            </label>
                            <label>
                                <span>Електронна пошта</span>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(event) => setEmail(event.target.value)}
                                    autoComplete="email"
                                    required
                                />
                            </label>
                            <label>
                                <span>Телефон</span>
                                <input
                                    type="tel"
                                    value={phone}
                                    onChange={(event) => setPhone(event.target.value)}
                                    autoComplete="tel"
                                    required
                                />
                            </label>
                            <div className="profile-form-actions">
                                <button type="submit" className="primary-button" disabled={isSavingProfile}>
                                    {isSavingProfile ? "Збереження…" : "Зберегти зміни"}
                                </button>
                                <button
                                    type="button"
                                    className="secondary-button"
                                    disabled={isSavingProfile}
                                    onClick={cancelProfileEdit}
                                >
                                    Скасувати
                                </button>
                            </div>
                        </form>
                    ) : (
                        <>
                            <div className="profile-form-readonly">
                                <div className="profile-form-readonly-field">
                                    <span>Ім&apos;я</span>
                                    <p>{name}</p>
                                </div>
                                <div className="profile-form-readonly-field">
                                    <span>Електронна пошта</span>
                                    <p>{email}</p>
                                </div>
                                <div className="profile-form-readonly-field">
                                    <span>Телефон</span>
                                    <p>{phone}</p>
                                </div>
                            </div>
                            <button type="button" className="secondary-button" onClick={startProfileEdit}>
                                Змінити інформацію
                            </button>
                        </>
                    )}
                </div>

                <div className="profile-account-footer">
                    {profile ? (
                        <p className="profile-account-created">
                            Акаунт створено{" "}
                            <time dateTime={profile.createdAtUtc}>
                                {formatUkrainianShortDate(profile.createdAtUtc)}
                            </time>
                        </p>
                    ) : (
                        <span />
                    )}
                    <button type="button" className="profile-logout-button" onClick={onLogout}>
                        Вийти
                    </button>
                </div>
            </section>

            <section className="profile-addresses-panel hero-panel">
                <div className="profile-addresses-head">
                    <h2 className="profile-addresses-title">Мої адреси</h2>
                    {!showAddressForm ? (
                        <button type="button" className="secondary-button compact" onClick={startAddAddress}>
                            Додати вулицю
                        </button>
                    ) : null}
                </div>

                {addressMessage ? <p className="profile-account-success">{addressMessage}</p> : null}
                {addressError ? (
                    <p className="profile-account-error" role="alert">
                        {addressError}
                    </p>
                ) : null}

                {profile && profile.addresses.length > 0 ? (
                    <>
                        <ul className="profile-address-list">
                            {(showAllAddresses
                                ? profile.addresses
                                : profile.addresses.slice(0, ADDRESSES_PREVIEW_COUNT)
                            ).map((address) => {
                                const isEditing = editingAddressId === address.id;

                                return (
                                    <li
                                        key={address.id}
                                        className={`profile-address-card${isEditing ? " profile-address-card--editing" : ""}${address.isLastUsed ? " profile-address-card--recent" : ""}`}
                                    >
                                        <div className="profile-address-card-icon">
                                            <AddressPinIcon />
                                        </div>
                                        <div className="profile-address-card-body">
                                            <div className="profile-address-card-top">
                                                <span className="profile-address-card-name">
                                                    {address.label?.trim() || "Адреса"}
                                                </span>
                                                {address.isLastUsed ? (
                                                    <span className="profile-address-card-tag">Остання</span>
                                                ) : null}
                                            </div>
                                            <p className="profile-address-card-line">{address.addressLine}</p>
                                        </div>
                                        <div className="profile-address-card-actions">
                                            <button
                                                type="button"
                                                className="profile-address-action"
                                                onClick={() => startEditAddress(address)}
                                                disabled={isSavingAddress}
                                            >
                                                Редагувати
                                            </button>
                                            <button
                                                type="button"
                                                className="profile-address-action profile-address-action--danger"
                                                onClick={() => void handleDeleteAddress(address.id)}
                                                disabled={isSavingAddress}
                                            >
                                                Видалити
                                            </button>
                                        </div>
                                    </li>
                                );
                            })}
                        </ul>
                        {profile.addresses.length > ADDRESSES_PREVIEW_COUNT ? (
                            <div className="profile-list-more profile-list-more--compact">
                                <p className="profile-list-more-meta">
                                    {showAllAddresses
                                        ? `Усі ${profile.addresses.length} адрес`
                                        : `Показано ${ADDRESSES_PREVIEW_COUNT} з ${profile.addresses.length}`}
                                </p>
                                <button
                                    type="button"
                                    className="secondary-button compact"
                                    onClick={() => setShowAllAddresses((current) => !current)}
                                >
                                    {showAllAddresses ? "Згорнути" : "Показати всі адреси"}
                                </button>
                            </div>
                        ) : null}
                    </>
                ) : (
                    <div className="profile-addresses-empty">
                        <AddressPinIcon />
                        <p>Ще немає збережених адрес</p>
                        <span>Додайте адресу тут або під час оформлення замовлення</span>
                    </div>
                )}

                {showAddressForm ? (
                    <form className="profile-form profile-address-form" onSubmit={handleSaveAddress}>
                        <h3 className="profile-address-form-title">
                            {editingAddressId ? "Редагувати адресу" : "Нова адреса"}
                        </h3>
                        <label>
                            <span>Назва</span>
                            <input
                                type="text"
                                placeholder="Дім, офіс…"
                                value={addressDraft.label}
                                onChange={(event) =>
                                    setAddressDraft((current) => ({ ...current, label: event.target.value }))
                                }
                            />
                        </label>
                        <label className="profile-address-form-field">
                            <span>Адреса</span>
                            <StreetAddressInput
                                value={addressDraft.addressLine}
                                onChange={(addressLine) =>
                                    setAddressDraft((current) => ({ ...current, addressLine }))
                                }
                                disabled={isSavingAddress}
                            />
                        </label>
                        <div className="profile-address-form-actions">
                            <button type="submit" className="primary-button compact" disabled={isSavingAddress}>
                                {isSavingAddress
                                    ? "Збереження…"
                                    : editingAddressId
                                      ? "Зберегти"
                                      : "Додати адресу"}
                            </button>
                            <button type="button" className="secondary-button compact" onClick={resetAddressForm}>
                                Скасувати
                            </button>
                        </div>
                    </form>
                ) : null}
            </section>
        </div>
    );
}

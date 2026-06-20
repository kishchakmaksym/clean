import { useCallback, useEffect, useState } from "react";

import {
    fetchAdminJobApplications,
    jobApplicationStatusLabels,
    updateJobApplicationStatus,
    type JobApplicationDto,
    type JobApplicationStatus,
} from "../api/jobApplications";
import ModalPortal from "../components/ModalPortal";
import { useBodyScrollLock } from "../hooks/useBodyScrollLock";
import { formatUkrainianDateTime } from "../utils/dateTime";
import "./ReviewsPage.css";

type ProfileAdminVacanciesTabProps = {
    userId: string;
};

const STATUS_OPTIONS: JobApplicationStatus[] = ["New", "Contacted", "Accepted", "Rejected"];

function statusClassName(status: JobApplicationStatus) {
    return `admin-vacancy-status admin-vacancy-status--${status.toLowerCase()}`;
}

export default function ProfileAdminVacanciesTab({ userId }: ProfileAdminVacanciesTabProps) {
    const [applications, setApplications] = useState<JobApplicationDto[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [loadError, setLoadError] = useState("");
    const [updatingId, setUpdatingId] = useState<string | null>(null);
    const [readingApplication, setReadingApplication] = useState<JobApplicationDto | null>(null);

    useBodyScrollLock(readingApplication !== null);

    const loadApplications = useCallback(async () => {
        setIsLoading(true);
        setLoadError("");

        try {
            const data = await fetchAdminJobApplications(userId);
            setApplications(data.applications);
        } catch {
            setLoadError("Не вдалося завантажити заявки.");
        } finally {
            setIsLoading(false);
        }
    }, [userId]);

    useEffect(() => {
        void loadApplications();
    }, [loadApplications]);

    async function handleStatusChange(applicationId: string, status: JobApplicationStatus) {
        setUpdatingId(applicationId);

        const result = await updateJobApplicationStatus({
            userId,
            applicationId,
            status,
        });

        setUpdatingId(null);

        if (!result.success || !result.application) {
            setLoadError(result.errors?.[0] ?? "Не вдалося оновити статус.");
            return;
        }

        setLoadError("");
        setApplications((current) =>
            current.map((item) => (item.id === applicationId ? result.application! : item)),
        );
        setReadingApplication((current) =>
            current?.id === applicationId ? result.application! : current,
        );
    }

    return (
        <div className="admin-vacancies-panel">
            <div className="admin-vacancies-head">
                <h2>Заявки на вакансію</h2>
                <p>Нові відгуки кандидатів зі сторінки «Вакансії».</p>
            </div>

            {isLoading ? <p className="admin-vacancies-meta">Завантаження…</p> : null}
            {loadError ? (
                <p className="admin-vacancies-error" role="alert">
                    {loadError}
                </p>
            ) : null}

            {!isLoading && applications.length === 0 ? (
                <p className="admin-vacancies-meta">Ще немає заявок.</p>
            ) : null}

            <ul className="admin-vacancies-list">
                {applications.map((application) => (
                    <li key={application.id} className="admin-vacancy-card">
                        <div className="admin-vacancy-card-top">
                            <div>
                                <h3>{application.fullName}</h3>
                                <p className="admin-vacancies-meta">
                                    {formatUkrainianDateTime(application.createdAtUtc)} · {application.phone}
                                    {application.age ? ` · ${application.age} р.` : ""}
                                </p>
                            </div>
                            <span className={statusClassName(application.status)}>
                                {jobApplicationStatusLabels[application.status]}
                            </span>
                        </div>

                        <p className="admin-vacancy-preview">
                            {application.experience || application.about || "Без додаткового опису"}
                        </p>

                        <div className="admin-vacancy-actions">
                            <button
                                type="button"
                                className="secondary-button compact"
                                onClick={() => setReadingApplication(application)}
                            >
                                Деталі
                            </button>

                            <select
                                    value={application.status}
                                    disabled={updatingId === application.id}
                                    aria-label="Статус заявки"
                                    onChange={(event) =>
                                        void handleStatusChange(
                                            application.id,
                                            event.target.value as JobApplicationStatus,
                                        )
                                    }
                                >
                                    {STATUS_OPTIONS.map((status) => (
                                        <option key={status} value={status}>
                                            {jobApplicationStatusLabels[status]}
                                        </option>
                                    ))}
                                </select>
                        </div>
                    </li>
                ))}
            </ul>

            {readingApplication ? (
                <ModalPortal>
                    <div
                        className="review-modal-backdrop"
                        role="presentation"
                        onClick={() => setReadingApplication(null)}
                    >
                        <div
                            className="review-modal admin-vacancy-modal"
                            role="dialog"
                            aria-modal="true"
                            aria-labelledby="vacancy-modal-title"
                            onClick={(event) => event.stopPropagation()}
                        >
                            <header className="admin-vacancy-modal-head">
                                <div>
                                    <h3 id="vacancy-modal-title">{readingApplication.fullName}</h3>
                                    <p className="admin-vacancies-meta">
                                        {formatUkrainianDateTime(readingApplication.createdAtUtc)}
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    className="review-modal-close"
                                    aria-label="Закрити"
                                    onClick={() => setReadingApplication(null)}
                                >
                                    ×
                                </button>
                            </header>

                            <dl className="admin-vacancy-details">
                                <div>
                                    <dt>Телефон</dt>
                                    <dd>{readingApplication.phone}</dd>
                                </div>
                                <div>
                                    <dt>Вік</dt>
                                    <dd>{readingApplication.age ?? "—"}</dd>
                                </div>
                                <div>
                                    <dt>Досвід</dt>
                                    <dd>{readingApplication.experience || "—"}</dd>
                                </div>
                                <div>
                                    <dt>Про себе</dt>
                                    <dd>{readingApplication.about || "—"}</dd>
                                </div>
                            </dl>
                        </div>
                    </div>
                </ModalPortal>
            ) : null}
        </div>
    );
}

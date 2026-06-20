export type JobApplicationStatus = "New" | "Contacted" | "Accepted" | "Rejected";

export type JobApplicationDto = {
    id: string;
    fullName: string;
    phone: string;
    age: number | null;
    experience: string;
    about: string;
    status: JobApplicationStatus;
    createdAtUtc: string;
    updatedAtUtc: string;
};

export type SubmitJobApplicationResponse = {
    success: boolean;
    message?: string;
    errors?: string[];
    application?: JobApplicationDto;
};

export type AdminJobApplicationsResponse = {
    applications: JobApplicationDto[];
};

export type UpdateJobApplicationStatusResponse = {
    success: boolean;
    message?: string;
    errors?: string[];
    application?: JobApplicationDto;
};

export const jobApplicationStatusLabels: Record<JobApplicationStatus, string> = {
    New: "Нова",
    Contacted: "На зв'язку",
    Accepted: "Прийнята",
    Rejected: "Відхилена",
};

export async function submitJobApplication(payload: {
    fullName: string;
    phone: string;
    age?: number | null;
    experience?: string;
    about?: string;
}): Promise<SubmitJobApplicationResponse> {
    const response = await fetch("/api/job-applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
    });

    return (await response.json()) as SubmitJobApplicationResponse;
}

export async function fetchAdminJobApplications(userId: string): Promise<AdminJobApplicationsResponse> {
    const response = await fetch(`/api/job-applications/admin?userId=${encodeURIComponent(userId)}`);

    if (response.status === 403) {
        throw new Error("Немає доступу.");
    }

    if (!response.ok) {
        throw new Error("Не вдалося завантажити заявки.");
    }

    return (await response.json()) as AdminJobApplicationsResponse;
}

export async function updateJobApplicationStatus(payload: {
    userId: string;
    applicationId: string;
    status: JobApplicationStatus;
}): Promise<UpdateJobApplicationStatusResponse> {
    const response = await fetch("/api/job-applications/admin/status", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
    });

    return (await response.json()) as UpdateJobApplicationStatusResponse;
}

import "../pages/HomePage.css";

const reviews = [
    {
        name: "Ірина",
        text: "Приїхали вчасно, все акуратно. Кухня й санвузол ідеальні — дуже задоволена.",
        meta: "Квартира • підтримуюче",
        stars: "★★★★★",
    },
    {
        name: "Олег",
        text: "Після ремонту було багато пилу — впорались швидко, без зайвих питань. Рекомендую.",
        meta: "Після ремонту",
        stars: "★★★★★",
    },
    {
        name: "Марія",
        text: "Сподобалось, що працюють за чек-листом і питають про нюанси. Результат топ.",
        meta: "Генеральне",
        stars: "★★★★☆",
    },
];

export default function ReviewsPage() {
    return (
        <section className="section">
            <div className="section-head">
                <span className="badge">Відгуки</span>
                <h2>Що кажуть клієнти</h2>
                <p>Реальні враження від наших клієнтів.</p>
            </div>

            <div className="grid-3">
                {reviews.map((r) => (
                    <article key={`${r.name}-${r.meta}`} className="glass-card info-card">
                        <div className="info-icon" aria-hidden="true">
                            {r.stars}
                        </div>
                        <h3>{r.name}</h3>
                        <p>{r.text}</p>
                        <p className="review-meta">{r.meta}</p>
                    </article>
                ))}
            </div>
        </section>
    );
}

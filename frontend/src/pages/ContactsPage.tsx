import "../pages/HomePage.css";

export default function ContactsPage() {
    return (
        <section className="section">
            <div className="section-head">
                <h2>Контакти</h2>
                <p>Залиште номер — ми передзвонимо. Або напишіть у месенджер, як вам зручніше.</p>
            </div>

            <div className="contact">
                <div className="contact-copy">
                    <div className="contact-lines">
                        <div className="contact-line">
                            <span className="contact-label">Телефон</span>
                            <span className="contact-value">+380 XX XXX XX XX</span>
                        </div>
                        <div className="contact-line">
                            <span className="contact-label">Email</span>
                            <span className="contact-value">cleanpro@gmail.com</span>
                        </div>
                    </div>
                </div>

                <form className="contact-form" onSubmit={(e) => e.preventDefault()}>
                    <label>
                        <span>Ім’я</span>
                        <input placeholder="Ваше ім’я" autoComplete="name" />
                    </label>
                    <label>
                        <span>Телефон</span>
                        <input placeholder="+380..." autoComplete="tel" inputMode="tel" />
                    </label>
                    <label>
                        <span>Що потрібно прибрати?</span>
                        <textarea placeholder="Квартира 2 кімнати, генеральне..." rows={4} />
                    </label>
                    <button type="submit" className="primary-button">
                        Відправити
                    </button>
                    <p className="fineprint">
                        Натискаючи “Відправити”, ви погоджуєтесь на обробку контактних даних для зв’язку.
                    </p>
                </form>
            </div>
        </section>
    );
}


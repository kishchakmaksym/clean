import { Link } from "react-router-dom";
import "../pages/HomePage.css";

export default function PricesPage() {
    return (
        <section className="section">
            <div className="section-head row">
                <div>
                    <h2>Ціни</h2>
                    <p>
                        Тут буде калькулятор і детальні тарифи. Поки що залишив кнопку-заглушку “Розрахувати
                        вартість”.
                    </p>
                </div>
                <Link to="/contacts" className="secondary-button">
                    Написати нам
                </Link>
            </div>

            <div className="cta">
                <div>
                    <h2>Розрахувати вартість</h2>
                    <p>Натисніть кнопку — пізніше підключимо реальний розрахунок.</p>
                </div>
                <button className="primary-button" type="button">
                    Розрахувати вартість
                </button>
            </div>
        </section>
    );
}


export type CustomExtraPriceUnit = "flat" | "sqm" | "piece" | "door";

export type CustomExtraItem = {
    id: string;
    label: string;
    price: number;
    priceUnit?: CustomExtraPriceUnit;
    /** Позначка, що ціну вже вручну задано в конфігу */
    priceConfirmed?: boolean;
};

export type CustomExtraCategory = {
    id: string;
    title: string;
    items: readonly CustomExtraItem[];
};

export const customCleaningTypes = [
    { id: "regular", label: "Звичайне", basePerSqm: 18 },
    { id: "deep", label: "Генеральне", basePerSqm: 28 },
    { id: "express", label: "Експрес-прибирання", basePerSqm: 24 },
    { id: "post-renovation", label: "Після ремонту", basePerSqm: 105 },
] as const;

export const MIN_CUSTOM_ORDER_TOTAL = 1000;

export const propertyTypeOptions = [
    { id: "apartment", label: "Квартира" },
    { id: "house", label: "Будинок" },
    { id: "office", label: "Офіс" },
] as const;

export const pollutionLevelOptions = [
    { id: "light", label: "Легке" },
    { id: "medium", label: "Середнє" },
    { id: "heavy", label: "Сильне" },
] as const;

export const customExtraCategories: readonly CustomExtraCategory[] = [
    {
        id: "main",
        title: "Основні роботи",
        items: [
            { id: "main-vacuum", label: "Пилососіння підлоги", price: 3, priceUnit: "sqm", priceConfirmed: true },
            { id: "main-mop", label: "Миття підлоги", price: 4, priceUnit: "sqm", priceConfirmed: true },
            { id: "main-sweep", label: "Підмітання", price: 60 },
            { id: "main-dust", label: "Витирання пилу з усіх поверхонь", price: 3, priceUnit: "sqm", priceConfirmed: true },
            { id: "main-baseboards", label: "Прибирання плінтусів", price: 80 },
            { id: "main-cobwebs", label: "Видалення павутиння", price: 70 },
            { id: "main-doors", label: "Очищення дверей і ручок", price: 50, priceUnit: "door", priceConfirmed: true },
            { id: "main-switches", label: "Протирання вимикачів та розеток", price: 65 },
            { id: "main-under-furniture", label: "Прибирання під меблями", price: 120 },
            { id: "main-hard-reach", label: "Прибирання важкодоступних місць", price: 130 },
        ],
    },
    {
        id: "kitchen",
        title: "Кухня",
        items: [
            { id: "kit-facades", label: "Миття фасадів кухні", price: 120 },
            { id: "kit-counter", label: "Миття стільниці", price: 80 },
            { id: "kit-backsplash", label: "Миття кухонного фартуха", price: 90 },
            { id: "kit-sink", label: "Миття раковини", price: 70, priceConfirmed: true },
            { id: "kit-faucet", label: "Чистка змішувача", price: 60 },
            { id: "kit-hood-out", label: "Миття витяжки зовні", price: 100 },
            { id: "kit-hood-in", label: "Чистка витяжки всередині", price: 180 },
            { id: "kit-microwave-out", label: "Миття мікрохвильовки зовні", price: 70 },
            { id: "kit-microwave-in", label: "Чистка мікрохвильовки всередині", price: 120 },
            { id: "kit-fridge-out", label: "Миття холодильника зовні", price: 50, priceConfirmed: true },
            { id: "kit-fridge-in", label: "Чистка холодильника всередині", price: 150, priceConfirmed: true },
            { id: "kit-freezer", label: "Чистка морозильної камери", price: 180 },
            { id: "kit-oven", label: "Чистка духовки", price: 250, priceConfirmed: true },
            { id: "kit-oven-racks", label: "Чистка дека та решіток", price: 120 },
            { id: "kit-stove", label: "Миття варильної поверхні", price: 110 },
            { id: "kit-dishwasher", label: "Чистка посудомийної машини", price: 150, priceConfirmed: true },
            { id: "kit-cabinets-out", label: "Миття кухонних шафок зовні", price: 140 },
            { id: "kit-cabinets-in", label: "Миття кухонних шафок всередині", price: 220 },
            { id: "kit-shelves", label: "Прибирання кухонних полиць", price: 90 },
            { id: "kit-trash", label: "Винесення сміття", price: 50, priceConfirmed: true },
        ],
    },
    {
        id: "bathroom",
        title: "Санвузол",
        items: [
            { id: "bath-toilet", label: "Миття унітаза", price: 100, priceConfirmed: true },
            { id: "bath-bidet", label: "Миття біде", price: 80, priceConfirmed: true },
            { id: "bath-tub", label: "Миття ванни", price: 150, priceConfirmed: true },
            { id: "bath-shower", label: "Миття душової кабіни", price: 140 },
            { id: "bath-lime", label: "Видалення вапняного нальоту", price: 150 },
            { id: "bath-rust", label: "Видалення іржі", price: 160 },
            { id: "bath-mold", label: "Видалення плісняви", price: 180 },
            { id: "bath-sink", label: "Миття умивальника", price: 80, priceConfirmed: true },
            { id: "bath-faucet-polish", label: "Полірування змішувачів", price: 70 },
            { id: "bath-mirror", label: "Миття дзеркал", price: 50, priceUnit: "piece", priceConfirmed: true },
            { id: "bath-tiles", label: "Миття плитки", price: 120 },
            { id: "bath-grout", label: "Чистка міжплиткових швів", price: 160 },
            { id: "bath-washer-out", label: "Миття пральної машини зовні", price: 80 },
            { id: "bath-washer-in", label: "Чистка пральної машини всередині", price: 150 },
            { id: "bath-dryer", label: "Чистка сушильної машини", price: 140 },
            { id: "bath-supplies", label: "Поповнення витратних матеріалів клієнта", price: 0 },
        ],
    },
    {
        id: "windows",
        title: "Вікна та скло",
        items: [
            { id: "win-inside", label: "Миття вікон зсередини", price: 100, priceUnit: "piece", priceConfirmed: true },
            { id: "win-both", label: "Миття вікон з двох сторін", price: 200, priceUnit: "piece", priceConfirmed: true },
            { id: "win-panoramic", label: "Миття панорамних вікон", price: 450 },
            { id: "win-balcony-block", label: "Миття балконних блоків", price: 220 },
            { id: "win-sill", label: "Миття підвіконь", price: 90 },
            { id: "win-frame", label: "Миття рам", price: 120 },
            { id: "win-blinds", label: "Миття жалюзі", price: 200 },
            { id: "win-rollers", label: "Миття ролетів", price: 220 },
            { id: "win-mirror", label: "Миття дзеркал", price: 80 },
            { id: "win-glass-wall", label: "Миття скляних перегородок", price: 280 },
        ],
    },
    {
        id: "furniture",
        title: "Меблі та текстиль",
        items: [
            { id: "fur-sofa", label: "Пилососіння диванів", price: 150 },
            { id: "fur-mattress", label: "Пилососіння матраців", price: 120 },
            { id: "fur-armchair", label: "Пилососіння крісел", price: 100 },
            { id: "fur-curtains", label: "Пилососіння штор", price: 130 },
            { id: "fur-bed", label: "Заправляння ліжка", price: 70 },
            { id: "fur-linen", label: "Заміна постільної білизни", price: 90 },
            { id: "fur-clothes", label: "Складання одягу", price: 100 },
            { id: "fur-closet", label: "Організація речей у шафі", price: 150 },
            { id: "fur-toys", label: "Прибирання дитячих іграшок", price: 110 },
        ],
    },
    {
        id: "tech",
        title: "Техніка",
        items: [
            { id: "tech-tv", label: "Чистка телевізора", price: 80 },
            { id: "tech-monitor", label: "Протирання моніторів", price: 60 },
            { id: "tech-desk", label: "Чистка комп'ютерного столу", price: 70 },
            { id: "tech-ac-out", label: "Очищення кондиціонера зовні", price: 120 },
            { id: "tech-ac-filter", label: "Чистка фільтрів кондиціонера", price: 180 },
            { id: "tech-radiator", label: "Чистка радіаторів", price: 130 },
            { id: "tech-vents", label: "Чистка вентиляційних решіток", price: 100 },
        ],
    },
    {
        id: "outdoor",
        title: "Балкон, лоджія, тераса",
        items: [
            { id: "out-sweep", label: "Підмітання балкона", price: 80 },
            { id: "out-mop", label: "Миття підлоги балкона", price: 100 },
            { id: "out-rail", label: "Миття перил", price: 90 },
            { id: "out-loggia", label: "Прибирання лоджії", price: 150 },
            { id: "out-terrace", label: "Прибирання тераси", price: 180 },
            { id: "out-pigeons", label: "Прибирання після голубів", price: 220 },
            { id: "out-trash", label: "Винесення сміття з балкона", price: 60 },
        ],
    },
    {
        id: "renovation",
        title: "Після ремонту",
        items: [
            { id: "ren-dust", label: "Збір будівельного пилу", price: 200 },
            { id: "ren-cement", label: "Видалення залишків цементу", price: 250 },
            { id: "ren-paint", label: "Видалення фарби", price: 220 },
            { id: "ren-foam", label: "Видалення монтажної піни", price: 180 },
            { id: "ren-tiles", label: "Миття плитки після ремонту", price: 240 },
            { id: "ren-windows", label: "Миття вікон після ремонту", price: 280 },
            { id: "ren-debris", label: "Винесення легкого будівельного сміття", price: 300 },
        ],
    },
    {
        id: "premium",
        title: "Додаткові послуги",
        items: [
            { id: "prem-sofa-dry", label: "Хімчистка дивана", price: 650 },
            { id: "prem-mattress-dry", label: "Хімчистка матраца", price: 550 },
            { id: "prem-carpet-dry", label: "Хімчистка килима", price: 480 },
            { id: "prem-ozone", label: "Озонування приміщення", price: 400 },
            { id: "prem-disinfect", label: "Дезінфекція", price: 350 },
            { id: "prem-move", label: "Прибирання після переїзду", price: 320 },
        ],
    },
] as const;

export const allCustomExtras: readonly CustomExtraItem[] = customExtraCategories.flatMap(
    (category) => category.items,
);

/** Послуги блоку «Топ продаж» — окремий список, не дублюється в категоріях нижче. */
export const topSellerExtras: readonly CustomExtraItem[] = [
    { id: "top-windows", label: "Миття вікон", price: 250, priceConfirmed: true },
    { id: "top-fridge", label: "Холодильник", price: 180, priceConfirmed: true },
    { id: "top-kitchen", label: "Вологе прибирання кухні", price: 200, priceConfirmed: true },
    { id: "top-bathroom", label: "Санвузол", price: 180, priceConfirmed: true },
];

export const allOrderExtras: readonly CustomExtraItem[] = [
    ...topSellerExtras,
    ...allCustomExtras,
];

export function getCustomExtraById(id: string) {
    return allOrderExtras.find((item) => item.id === id);
}

export function getTopSellerExtras(): readonly CustomExtraItem[] {
    return topSellerExtras;
}

export function calculateCustomExtraTotal(extra: CustomExtraItem, sqm: number, quantity = 1) {
    if (extra.price <= 0) {
        return 0;
    }

    switch (extra.priceUnit ?? "flat") {
        case "sqm":
            return extra.price * sqm;
        case "piece":
        case "door":
            return extra.price * quantity;
        default:
            return extra.price;
    }
}

export function formatCustomExtraRate(extra: CustomExtraItem) {
    if (extra.price <= 0) {
        return "включено";
    }

    switch (extra.priceUnit ?? "flat") {
        case "sqm":
            return `+${extra.price.toLocaleString("uk-UA")} ₴/м²`;
        case "door":
            return `+${extra.price.toLocaleString("uk-UA")} ₴/двері`;
        case "piece":
            return `+${extra.price.toLocaleString("uk-UA")} ₴/шт`;
        default:
            return `+${extra.price.toLocaleString("uk-UA")} ₴`;
    }
}

export function customExtraUsesQuantity(extra: CustomExtraItem) {
    return extra.priceUnit === "piece" || extra.priceUnit === "door";
}

export function getCustomExtraQuantityLabel(extra: CustomExtraItem) {
    return extra.priceUnit === "door" ? "Дверей" : "Кількість";
}

export function formatCustomExtraOrderLabel(extra: CustomExtraItem, quantity: number) {
    if (customExtraUsesQuantity(extra)) {
        const unitLabel = extra.priceUnit === "door" ? "двері" : "шт.";
        return `${extra.label} — ${quantity} ${unitLabel}`;
    }

    return extra.label;
}

export function getSelectedCustomExtraLabels(quantities: Record<string, number>) {
    return allOrderExtras
        .filter((extra) => (quantities[extra.id] ?? 0) > 0)
        .map((extra) => formatCustomExtraOrderLabel(extra, quantities[extra.id] ?? 1));
}

export function buildCustomOrganizationalNote(options: {
    propertyType: string;
    pollutionLevel: string;
    hasPets: boolean;
    ownSupplies: boolean;
    needLadder: boolean;
    cleanersCount: string;
}) {
    const propertyLabel =
        propertyTypeOptions.find((item) => item.id === options.propertyType)?.label ?? options.propertyType;
    const pollutionLabel =
        pollutionLevelOptions.find((item) => item.id === options.pollutionLevel)?.label ??
        options.pollutionLevel;

    return [
        `Тип житла: ${propertyLabel}`,
        `Ступінь забруднення: ${pollutionLabel}`,
        `Домашні тварини: ${options.hasPets ? "так" : "ні"}`,
        `Власні засоби: ${options.ownSupplies ? "потрібні" : "наші"}`,
        `Драбина: ${options.needLadder ? "потрібна" : "не потрібна"}`,
        `Прибиральників: ${options.cleanersCount || "1"}`,
    ].join(". ");
}

export class Metric {
    constructor(name, isTime) {
        this.name = name
    }

    add(value, tags) {

    }
}

export class Counter extends Metric {
}

export class Gauge extends Metric {
}

export class Rate extends Metric {
}

export class Trend extends Metric {
}

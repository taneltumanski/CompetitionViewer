import { Pipe, PipeTransform } from '@angular/core';
import { RaceEventMessage, RaceEventResultMessage } from '../../models/racemessages';
import { DecimalPipe } from '@angular/common';

@Pipe({
    name: 'lane'
})
export class LanePipe implements PipeTransform {
    transform(value: string | null): any {
        if (value == null) {
            return "---";
        }

        return value.toUpperCase();
    }
}

@Pipe({
    name: 'raceResult'
})
export class RaceResultPipe implements PipeTransform {
    transform(value: number | null): any {
        if (value == null) {
            return "---";
        }

        return value == 0 ? "Winner" : "Runnerup";
    }
}

@Pipe({
    name: 'timeDifference'
})
export class TimeDifferencePipe implements PipeTransform {
    transform(value: RaceEventMessage | null, currentResult: RaceEventResultMessage): any {
        if (value == null) {
            return "---";
        }

        let winnerResult = value.results.find(x => x.result == 0);

        if (winnerResult == undefined || winnerResult.racerId == currentResult.racerId || winnerResult.racerId.toLowerCase() == "bye" || currentResult.racerId.toLowerCase() == "bye") {
            return "---";
        }

        if (currentResult.finishTime == 0) {
            return "---";
        }

        if (currentResult.dialIn == null || winnerResult.dialIn == null || currentResult.reactionTime == null || currentResult.finishTime == null || winnerResult.reactionTime == null || winnerResult.finishTime == null) {
            return "---";
        }

        if (currentResult.dialIn > 0 || winnerResult.dialIn > 0) {
            let currentResultDialInDifference = currentResult.reactionTime + currentResult.finishTime - currentResult.dialIn;
            let winnerResultDialInDifference = winnerResult.reactionTime + winnerResult.finishTime - winnerResult.dialIn;
            let difference = currentResultDialInDifference - winnerResultDialInDifference;

            return (difference > 0 ? "+" : "") + difference.toFixed(5);
        } else {
            let currentResultDiff = currentResult.reactionTime + currentResult.finishTime;
            let winnerResultDiff = winnerResult.reactionTime + winnerResult.finishTime;
            let difference = currentResultDiff - winnerResultDiff;

            return (difference > 0 ? "+" : "") + difference.toFixed(5);
        }
    }
}

@Pipe({
    name: 'dialInAccuracy'
})
export class DialInAccuracyPipe implements PipeTransform {
    transform(value: RaceEventResultMessage | null): any {
        if (value == null || value.finishTime == null) {
            return "---";
        }

        if (value.dialIn == null || value.dialIn == 0) {
            return "---";
        }

        let difference = value.finishTime - value.dialIn;
        if (difference == 0) {
            return 0;
        }

        return (difference > 0 ? "+" : "") + difference.toFixed(5);
    }
}

@Pipe({
    name: 'myNumber'
})
export class MyNumberPipe implements PipeTransform {
    transform(value: any, defaultValue: string | null): any {
        if (this.isNumber(value)) {
            let val = value as number;

            return (val > 0 ? "+" : "") + val.toFixed(5);
        }

        return defaultValue;
    }

    private isNumber(value: string | number): boolean {
        return (value != null) && (value !== '') && !isNaN(Number(value.toString()));
    }
}

@Pipe({
    name: 'total'
})
export class TotalPipe implements PipeTransform {
    transform(value: RaceEventResultMessage | null): any {
        if (value && value.reactionTime && value.finishTime) {
            return value.reactionTime + value.finishTime;
        }

        return null;
    }

    private isNumber(value: string | number): boolean {
        return (value != null) && (value !== '') && !isNaN(Number(value.toString()));
    }
}



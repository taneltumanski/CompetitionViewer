import { Pipe, PipeTransform } from '@angular/core';
import { RaceEventMessage, RaceEventResult } from './competition.component';

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
  transform(value: RaceEventMessage | null, currentResult: RaceEventResult): any {
    if (value == null) {
      return "---";
    }

    let winnerResult = value.results.find(x => x.result == 0);

    if (winnerResult == undefined || winnerResult.racerId == currentResult.racerId || winnerResult.racerId.toLowerCase() == "bye" || currentResult.racerId.toLowerCase() == "bye") {
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
  transform(value: RaceEventResult | null): any {
    if (value == null) {
      return "---";
    }

    if (value.dialIn == 0 || value.dialIn == null) {
      return "---";
    }

    let difference = value.finishTime - value.dialIn;
    if (difference == 0) {
      return 0;
    }

    return (difference > 0 ? "+" : "") + difference.toFixed(5);
  }
}


import { Pipe, PipeTransform } from '@angular/core';
import { RaceEventMessage, RaceEventResult } from './competition.component';

@Pipe({
  name: 'lane'
})
export class LanePipe implements PipeTransform {
  transform(value: number | null): any {
    if (value == null) {
      return "---";
    }

    return value == 0 ? "Left" : "Right";
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

    var winnerResult = value.results.find(x => x.result == 0);

    if (winnerResult == undefined || winnerResult.racerId == currentResult.racerId || winnerResult.racerId.toLowerCase() == "bye" || currentResult.racerId.toLowerCase() == "bye") {
      return "---";
    }

    if (currentResult.dialIn > 0 || winnerResult.dialIn > 0) {
      var currentResultDialInDifference = currentResult.reactionTime + currentResult.finishTime - currentResult.dialIn;
      var winnerResultDialInDifference = winnerResult.reactionTime + winnerResult.finishTime - winnerResult.dialIn;
      var difference = winnerResultDialInDifference - currentResultDialInDifference;

      return difference.toFixed(5);
    } else {
      var currentResultDiff = currentResult.reactionTime + currentResult.finishTime;
      var winnerResultDiff = winnerResult.reactionTime + winnerResult.finishTime;
      var difference = winnerResultDiff - currentResultDiff;

      return difference.toFixed(5);
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

    var difference = value.finishTime - value.dialIn;
    if (difference == 0) {
      return 0;
    }

    return difference < 0 ? difference.toFixed(5) : "+" + difference.toFixed(5);
  }
}


import { Pipe, PipeTransform } from '@angular/core';

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

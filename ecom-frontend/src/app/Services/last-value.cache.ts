import { Observable, tap } from 'rxjs';

/**
 * Remembers the last response per key (e.g. per signed-in user) so account pages can render
 * instantly when revisited, while a fresh request updates them in the background.
 */
export class LastValueCache<T> {
  private values = new Map<string, T>();

  peek(key: string | null | undefined): T | undefined {
    return key ? this.values.get(key) : undefined;
  }

  /** Pipes a request so its result is stored under `key` */
  track(key: string | null | undefined, request: Observable<T>): Observable<T> {
    return request.pipe(tap((value) => key && this.values.set(key, value)));
  }

  set(key: string | null | undefined, value: T): void {
    if (key) this.values.set(key, value);
  }

  clear(): void {
    this.values.clear();
  }
}

import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class UploadService {
  private apiUrl = `${environment.apiUrl}/uploads`;

  constructor(private http: HttpClient) {}

  /** Uploads images to the API's /uploads folder and returns their URLs */
  uploadImages(files: File[]): Observable<string[]> {
    const form = new FormData();
    files.forEach((file) => form.append('images', file));
    return this.http.post<{ urls: string[] }>(this.apiUrl, form).pipe(map((res) => res.urls));
  }
}

import {
  VideoGenerateRequest, VideoGenerateResult,
  VideoPollStatusRequest, VideoPollStatusResult,
  VideoUploadRequest, VideoUploadResult,
} from '../types';

export async function videoGenerate(request: VideoGenerateRequest): Promise<VideoGenerateResult> {
  return window.electron.video.generate(request);
}

export async function videoPollStatus(request: VideoPollStatusRequest): Promise<VideoPollStatusResult> {
  return window.electron.video.pollStatus(request);
}

export async function videoUpload(request: VideoUploadRequest): Promise<VideoUploadResult> {
  return window.electron.video.upload(request);
}

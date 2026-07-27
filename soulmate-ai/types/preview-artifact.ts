export type PreviewArtifactKind = 'html' | 'code' | 'svg' | 'image';

export type PreviewArtifact = {
  id: string;
  kind: PreviewArtifactKind;
  title: string;
  language: string;
  content: string;
};

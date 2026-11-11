import { useEffect, useRef, useState } from 'react'
import { Player, type PlayerRef } from '@remotion/player'
import { Reel } from '../../remotion/Reel'
import { Timeline } from '../editor/Timeline'
import { ClipSettings } from '../editor/ClipSettings'
import { tofuCase } from '../../lib/demo/tofuCase'
import { createDemoEditDraft, demoEditKey, demoSources, parseDemoEditDraft, withDemoProject, observeDemoMetadata } from '../../lib/demo/editDraft'
import type { DemoEditDraft, DemoMediaMetadata } from '../../lib/demo/editDraft'
import type { DemoRoute } from '../../lib/demo/session'
import type { EditProject, ReelInput } from '../../lib/editor/types'
import type { TimelineActions } from '../../lib/editor/useTimelineActions'
import { reelDurationInFrames, setClipAudio, sourceKey } from '../../lib/editor/timeline'
import '../../styles/editor.css'
import './native-demo.css'

export type DemoEditProps = { route: DemoRoute; lang: 'en' | 'zh-Hant'; selectedAssetId: string; onBack: () => void }

export default function DemoEdit(props: DemoEditProps) {
  return <LoadEditor key={props.route} {...props} />
}

function LoadEditor(props: DemoEditProps) {
  const [metadata, setMetadata] = useState<DemoMediaMetadata>({})
  const [errors, setErrors] = useState<string[]>([])
  const metadataElements = useRef<HTMLDivElement>(null)
  const [retry, setRetry] = useState(0)
  const videos = tofuCase.assets.filter(asset => asset.kind === 'video' && asset.available && asset.routes.includes(props.route))
  const ready = videos.length > 0 && demoSources(props.route, metadata).length === videos.length
  const zh = props.lang === 'zh-Hant'
  useEffect(() => {
    const cleanups = Array.from(metadataElements.current?.querySelectorAll<HTMLVideoElement>('video[data-demo-asset]') ?? []).map(video => {
      const id = video.dataset.demoAsset!
      return observeDemoMetadata(video, info => {
        setMetadata(current => ({ ...current, [id]: info }))
        setErrors(current => current.filter(item => item !== id))
      }, () => {
        setErrors(current => current.includes(id) ? current : [...current, id])
        setMetadata(current => Object.fromEntries(Object.entries(current).filter(([key]) => key !== id)))
      })
    })
    return () => { for (const cleanup of cleanups) cleanup() }
  }, [props.route, retry])
  return <section className="demo-native demo-native-editor" data-testid="demo-editor">
    <div className="demo-native__metadata" aria-hidden="true" ref={metadataElements}>
      {videos.map(asset => <video key={`${asset.id}:${retry}`} data-demo-asset={asset.id} src={asset.relativePath} preload="metadata" />)}
    </div>
    {errors.length > 0 && <p role="alert">{zh ? '無法載入預備影片的 metadata。' : 'Prepared video metadata could not load.'} <button type="button" onClick={() => { setErrors([]); setRetry(value => value + 1) }}>{zh ? '重試媒體' : 'Retry media'}</button></p>}
    {ready ? <EditorWorkspace {...props} metadata={metadata} /> : <p role="status">{zh ? '讀取真實影片長度後開啟 Editor…' : 'Reading actual video durations before opening Editor…'}</p>}
  </section>
}

function EditorWorkspace({ route, lang, selectedAssetId, onBack, metadata }: DemoEditProps & { metadata: DemoMediaMetadata }) {
  const [initial] = useState(() => {
    try {
      const raw = sessionStorage.getItem(demoEditKey(route))
      const restored = parseDemoEditDraft(raw, route, metadata)
      return { draft: restored ?? createDemoEditDraft(route, selectedAssetId, metadata), invalid: raw !== null && !restored }
    } catch { return { draft: createDemoEditDraft(route, selectedAssetId, metadata), invalid: false } }
  })
  const [draft, setDraft] = useState<DemoEditDraft | null>(initial.draft)
  const [saveError, setSaveError] = useState(false)
  const [playerRetry, setPlayerRetry] = useState(0)
  const [frame, setFrame] = useState(0)
  const [selected, setSelected] = useState<string | null>(null)
  const player = useRef<PlayerRef>(null)
  const zh = lang === 'zh-Hant'
  const text = (en: string, hant: string) => zh ? hant : en
  const hasClips = !!draft?.project.clips.length
  useEffect(() => {
    const instance = player.current
    if (!instance) return
    const onFrame = (event: { detail: { frame: number } }) => setFrame(event.detail.frame)
    instance.addEventListener('frameupdate', onFrame)
    instance.addEventListener('seeked', onFrame)
    return () => { instance.removeEventListener('frameupdate', onFrame); instance.removeEventListener('seeked', onFrame) }
  }, [hasClips, playerRetry])

  // Persist only explicit edits, synchronously. Unmount/reset never writes an old draft back.
  function save(next: DemoEditDraft) {
    setDraft(next)
    try { sessionStorage.setItem(demoEditKey(route), JSON.stringify(next)); setSaveError(false) }
    catch { setSaveError(true) }
    player.current?.pause()
    player.current?.seekTo(0)
    setFrame(0)
  }
  function onProject(project: EditProject) {
    if (!draft) return
    const next = withDemoProject(draft, project, metadata)
    if (next) save(next)
  }
  function applySelected() {
    const next = createDemoEditDraft(route, selectedAssetId, metadata)
    if (next) { setSelected(null); save(next) }
  }
  if (!draft) return <p role="alert">{text('This source cannot form a valid draft. Return to choose another video.', '此來源無法建立有效草稿，請返回選擇另一支影片。')} <button type="button" onClick={onBack}>{text('Back to Canvas', '返回 Canvas')}</button></p>
  const project = draft.project
  const sources = Object.fromEntries(demoSources(route, metadata).map(source => [source.key, source]))
  const asset = tofuCase.assets.find(asset => asset.id === draft.assetId)!
  const clip = project.clips.find(clip => clip.id === selected) ?? null
  const timeline: TimelineActions = { useForShot: async () => false, isInTimeline: source => project.clips.some(clip => sourceKey(clip.source) === sourceKey(source)),
    applyNewer: async () => {}, fill: async () => [], statusOf: () => ({ state: 'ok' }), ignore: () => {} }
  const inputProps: ReelInput = { project, urls: Object.fromEntries(Object.values(sources).map(source => [source.key, source.url])),
    lines: {}, musicUrl: null, voice: [], brand: { font: 'Noto Sans TC', color: null, logoUrl: null }, fontUrl: '/fonts/NotoSansTC-VF.ttf' }
  return <div className="cv-ed">
    <div className="demo-native__toolbar"><button type="button" onClick={onBack}>{text('Back to Canvas', '返回 Canvas')}</button><button type="button" onClick={applySelected}>{draft.assetId === selectedAssetId ? text('Reset edit to selected video', '用選用影片重設剪輯') : text('Apply selected video and reset edit', '套用選用影片並重設剪輯')}</button></div>
    <p>{text('Local edit preview · prepared footage · no live generation or export.', '本地剪輯預覽 · 預備素材 · 不即時生成或匯出。')} {asset.label}</p>
    {draft.assetId !== selectedAssetId && <p role="status">{text('A different Canvas video is selected. Your existing draft is preserved until you apply it above.', 'Canvas 已改選另一支影片；按上方套用前會保留現有草稿。')}</p>}
    {initial.invalid && <p role="status">{text('Invalid saved draft was ignored; a safe prepared draft is shown.', '已忽略無效的儲存草稿，改為顯示安全的預備草稿。')}</p>}
    {saveError && <p role="status">{text('This browser could not save the edit for reload; your changes remain on this page.', '此瀏覽器無法儲存剪輯供重新整理恢復；變更保留在本頁。')}</p>}
    <div className="demo-native__edit-grid">
      <div className="demo-native__player">
        {hasClips ? <Player key={playerRetry} ref={player} component={Reel} inputProps={inputProps} durationInFrames={reelDurationInFrames(project)}
          fps={30} compositionWidth={1080} compositionHeight={1920} controls style={{ width: '100%', maxHeight: 430 }}
          errorFallback={() => <p role="alert">{text('Preview playback failed.', '預覽播放失敗。')} <button type="button" onClick={() => setPlayerRetry(value => value + 1)}>{text('Retry preview', '重試預覽')}</button></p>} /> : <p>{text('The timeline is empty. Reset the edit to add the selected video.', '時間線為空，請重設剪輯以加入選用影片。')}</p>}
      </div>
      <div><ClipSettings project={project} clip={clip} name={clip?.source.shotId?.toUpperCase() ?? ''} sourceDuration={clip ? sources[sourceKey(clip.source)].duration : 0} nodeId={null} readOnly={false} onProject={onProject} onJump={() => {}} />
        {clip && <button type="button" aria-pressed={clip.muted} onClick={() => onProject(setClipAudio(project, clip.id, { muted: !clip.muted }))}>{clip.muted ? text('Unmute selected clip', '取消選用片段靜音') : text('Mute selected clip', '將選用片段靜音')}</button>}
        <p>{text('Prepared files are silent; mute is saved in the draft. The original soundtrack is excluded.', '預備影片為靜音；靜音設定會存入草稿，原片音樂未納入。')}</p>
      </div>
    </div>
    <Timeline project={project} sources={sources} frame={frame} readOnly={false} timeline={timeline} selected={selected} onSelect={setSelected}
      nameOf={clip => clip.source.shotId?.toUpperCase() ?? clip.id} nodeOf={() => null} onJump={() => {}} onProject={onProject}
      onSeek={next => { const clamped = Math.max(0, Math.min(next, reelDurationInFrames(project) - 1)); player.current?.seekTo(clamped); setFrame(clamped) }} />
    <p>{text('Download prepared file does not include draft edits.', '下載的預備檔案不包含草稿剪輯變更。')} <a href={asset.relativePath} download>{text('Download prepared MP4', '下載預備 MP4')}</a></p>
  </div>
}

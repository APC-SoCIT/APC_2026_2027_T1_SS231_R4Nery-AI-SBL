const AI_FACE_SRC = '/ai-for-all/Story-Ai-Mascot.png'

export function StoryAiFace({ className = '' }: { className?: string }) {
  return (
    <img
      className={className}
      src={AI_FACE_SRC}
      alt="AI story guide"
      draggable={false}
    />
  )
}
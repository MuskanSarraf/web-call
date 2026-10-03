type CallControlsProps = {
  onCall: () => void;
  onEndCall: () => void;
  isCalling: boolean;
};

function CallControls({
  onCall,
  onEndCall,
  isCalling,
}: CallControlsProps) {
  return (
    <div>
      {!isCalling ? (
        <button onClick={onCall}>
          📞 Call
        </button>
      ) : (
        <button onClick={onEndCall}>
          🔴 End Call
        </button>
      )}
    </div>
  );
}

export default CallControls;
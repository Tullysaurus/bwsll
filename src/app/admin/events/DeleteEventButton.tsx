"use client";

export function DeleteEventButton() {
  return (
    <button
      type="submit"
      className="btn btn-secondary"
      style={{ borderColor: "#8C2F20", color: "#8C2F20" }}
      onClick={(e) => {
        if (!window.confirm("Delete this event? This can't be undone.")) e.preventDefault();
      }}
    >
      Delete event
    </button>
  );
}

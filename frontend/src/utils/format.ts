export function formatDateTime(
    value: string | null,
  ): string {
    if (!value) {
      return "Not yet";
    }
  
    const date = new Date(value);
  
    if (
      Number.isNaN(date.getTime())
    ) {
      return "—";
    }
  
    return new Intl.DateTimeFormat(
      undefined,
      {
        dateStyle: "medium",
        timeStyle: "short",
      },
    ).format(date);
  }
  
  export function formatEnum(
    value: string,
  ): string {
    return value
      .toLowerCase()
      .split("_")
      .map(
        (word) =>
          word.charAt(0).toUpperCase() +
          word.slice(1),
      )
      .join(" ");
  }
  
  export function getInitials(
    name: string,
  ): string {
    return name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map(
        (part) =>
          part.charAt(0).toUpperCase(),
      )
      .join("");
  }
import { SCHOOL_LABELS } from '../../data/spells';
import { schoolThemeColor, schoolThemeTextColor } from '../../data/schoolThemes';

interface SchoolBadgeProps {
  school: string;
}

// Full-word spell school label (e.g. "Conjuration") on its theme colour.
export function SchoolBadge({ school }: SchoolBadgeProps) {
  return (
    <span
      className="school-badge"
      style={{ backgroundColor: schoolThemeColor(school), color: schoolThemeTextColor(school) }}
    >
      {SCHOOL_LABELS[school] ?? school}
    </span>
  );
}

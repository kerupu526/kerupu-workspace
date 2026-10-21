import Field from "./Field";
import NoopForm from "./NoopForm";
import styles from "./SearchField.module.css";

interface SearchFieldProps {
  id: string;
  /** 화면에는 보이지 않고 보조기기에만 읽히는 이름 */
  label: string;
  /** 입력창 안에 보이는 안내 글자 (기본 "검색") */
  placeholder?: string;
  /** 폭을 바꾸려면 사용하는 쪽 CSS Module 에서 --search-width 를 지정한다 (기본 340px) */
  className?: string;
}

/* 검색창. 아직 검색 기능은 없다. */
export default function SearchField({ id, label, placeholder = "검색", className }: SearchFieldProps) {
  return (
    <NoopForm role="search" className={className ? `${styles.search} ${className}` : styles.search}>
      <Field id={id} label={label} type="search" placeholder={placeholder} hideLabel />
    </NoopForm>
  );
}

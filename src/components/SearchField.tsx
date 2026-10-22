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
  /**
   * 있으면 실제로 검색하는 폼이 된다: 이 주소로 GET 으로 보내 입력값을 주소(?name=값)에 싣는다.
   * 없으면 아직 동작하지 않는 폼이다.
   */
  action?: string;
  /** action 이 있을 때 입력값을 실을 주소 변수 이름 (기본 id) */
  name?: string;
  /** action 이 있을 때 처음 채워 둘 값 */
  defaultValue?: string;
  /** action 이 있을 때 검색해도 유지할 다른 주소 변수 (예: 고른 작품, 정렬) */
  keep?: Record<string, string>;
}

/* 검색창. action 을 주면 검색하고, 주지 않으면 아직 기능이 없는 모양이다. */
export default function SearchField({
  id,
  label,
  placeholder = "검색",
  className,
  action,
  name,
  defaultValue,
  keep,
}: SearchFieldProps) {
  const classes = className ? `${styles.search} ${className}` : styles.search;
  if (action === undefined) {
    return (
      <NoopForm role="search" className={classes}>
        <Field id={id} label={label} type="search" placeholder={placeholder} hideLabel />
      </NoopForm>
    );
  }
  return (
    <form role="search" method="get" action={action} className={classes}>
      {Object.entries(keep ?? {}).map(([key, value]) => (
        <input key={key} type="hidden" name={key} value={value} />
      ))}
      <Field
        id={id}
        name={name}
        label={label}
        type="search"
        placeholder={placeholder}
        defaultValue={defaultValue}
        hideLabel
      />
    </form>
  );
}

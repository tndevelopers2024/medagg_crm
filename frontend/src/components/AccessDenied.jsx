import { Result, Button } from "antd";
import { useNavigate } from "react-router-dom";

export default function AccessDenied() {
  const navigate = useNavigate();

  return (
    <Result
      status="403"
      title="403"
      subTitle="You don't have permission to access this page."
      extra={
        <Button type="primary" onClick={() => navigate("/admin")}>
          Go to Dashboard
        </Button>
      }
    />
  );
}

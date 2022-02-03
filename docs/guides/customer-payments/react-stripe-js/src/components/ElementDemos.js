import React from "react";
import {
  Switch,
  Route,
  Redirect,
  useLocation,
  useHistory
} from "react-router-dom";

const ElementDemos = ({ demos }) => {
  const location = useLocation();
  const history = useHistory();

  return (
    <div className="DemoWrapper">
      <Switch>
        <Redirect to={demos[0].path} from="/" exact />
        {demos.map(({ path, component: Component }) => (
          <Route key={path} path={path}>
            <div className="Demo">
              <Component />
            </div>
          </Route>
        ))}
      </Switch>
    </div>
  );
};

export default ElementDemos;

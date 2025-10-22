/**
 * Generic mock for @radix-ui/react-* packages.
 * Returns simple div-based components for any requested export.
 */

const React = require('react');

module.exports = new Proxy(
  {},
  {
    get: (_target, prop) => {
      const Comp = React.forwardRef((props, ref) => React.createElement('div', { ref, ...props }));
      Comp.displayName = String(prop);
      return Comp;
    },
  }
);


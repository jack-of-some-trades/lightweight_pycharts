"LazyModule of DataBroker APIs that can be imported and used desired"

from typing import TYPE_CHECKING

from lightweight_pycharts import LazyModule

__version__ = "0.0.0"

# Import all when Type Checking so you still get intellisense
if TYPE_CHECKING:
    from alpaca_api import AlpacaAPI

# The Remainder of this __init__ implements Lazy-Loading of Sub-Modules.

all_by_module = {
    "lightweight_pycharts.broker_apis.alpaca_api": ["AlpacaAPI"],
}
object_origins = {}

for module_name, items in all_by_module.items():
    for item in items:
        object_origins[item] = module_name

# setup the new module and patch it into the dict of loaded modules
new_module = LazyModule("lightweight_pycharts.broker_apis", object_origins, all_by_module)
new_module.__dict__.update(
    {
        "__file__": __file__,
        "__package__": "lightweight_pycharts.broker_apis",
        "__path__": __path__,
        "__doc__": __doc__,
        "__version__": __version__,
        "__all__": tuple(object_origins),
        "__docformat__": "restructuredtext en",
    }
)

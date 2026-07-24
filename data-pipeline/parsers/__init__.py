from . import ppfas
from . import hdfc
from . import hdfc_mid

PARSERS = {
    "ppfas": ppfas.parse,
    "hdfc": hdfc.parse,
    "hdfc_mid": hdfc_mid.parse,
}

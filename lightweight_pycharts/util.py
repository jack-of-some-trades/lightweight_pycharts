""" Utility functions and objects that are used across the library """

from itertools import islice
from random import choices
from string import ascii_letters
from typing import Optional


# @pylint: disable=invalid-name
class ID_List(list[str]):
    """
    A List of ID Strings with a generator function. Requires a separate list to store objects.

    Used in place of an ID_Dict when it is desired to manipulate the order of objects.
    """

    def __init__(self, prefix: str):
        self.prefix = prefix + "_"
        super().__init__()

    def generate(self) -> str:
        "Generates a new ID, adds it to the list, and returns it for use."
        _id = self.prefix + "".join(choices(ascii_letters, k=4))

        if _id not in self:
            self.append(_id)
            return _id
        else:  # In case of a collision.
            return self.generate()

    def affix(self, _id: str) -> str:
        "Add a given ID string to the List. If already present then a new ID is generated."
        _id_prefixed = self.prefix + _id
        if _id_prefixed not in self:
            self.append(_id_prefixed)
            return _id_prefixed
        else:  # In case of a collision.
            return self.generate()


# @pylint: disable=undefined-variable # Pylint thinks T is undefined
class ID_Dict[T](dict[str, T]):
    """
    A Dict that can store objects of a pre-defined or randomly generated key.
    """

    def __init__(self, prefix: str):
        self.prefix = prefix + "_"
        super().__init__()

    def __getitem__(self, key: str | int) -> T:
        "Accessor overload so the Dict can be accessed like a list"
        if isinstance(key, int):
            # Recall this function with the nth Key.
            try:
                return self[next(islice(iter(self), key, key + 1))]
            except StopIteration as exc:  # re-raise a more informative error msg.
                raise IndexError(f"'{key}' not a valid index of '{self}'") from exc

        return super().__getitem__(key)

    def generate(self, item: Optional[T] = None) -> str:
        "Generates and returns a new Key. If an item is given it is added to the dictionary"
        _id = self.prefix + "".join(choices(ascii_letters, k=4))

        if _id not in self:
            if item is not None:
                self[_id] = item
            return _id
        else:  # In case of a collision.
            return self.generate()

    def affix(self, _id: str, item: Optional[T] = None) -> str:
        """
        Try to add a specific Key to the Dict. If the Key is already present
        then a new one is generated.

        If an item is given it is automatically added to the dictionary.
        """
        _id_prefixed = self.prefix + _id
        if _id_prefixed not in self:
            if item is not None:
                self[_id_prefixed] = item
            return _id_prefixed
        else:  # In case of a collision.
            return self.generate(item)
